import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, StyleSheet, Text, TouchableOpacity, Vibration, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  clearEndTime,
  clearIntervalEndTime,
  DEFAULT_SETTINGS,
  getEndTime,
  getIntervalEndTime,
  getSettings,
  setEndTime,
  setIntervalEndTime,
  Settings,
} from '../utils/storage';
import { runAction } from '../utils/switchbot';
import { DeviceAction } from '../utils/storage';
import {
  cancelTimerEndNotification,
  getNotificationPermission,
  NotificationPermissionStatus,
  requestNotificationPermission,
  scheduleTimerEndNotification,
} from '../utils/notifications';

const WAKE_TAG = 'bottimer';

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }

function actionErrorLabel(action: DeviceAction): string {
  return action === 'on' ? 'ON失敗' : 'OFF失敗';
}

function actionRunningLabel(action: DeviceAction): string {
  if (action === 'on') return '● ON中';
  if (action === 'off') return '● OFF送信済み';
  return '● タイマー作動中';
}

interface Props {
  onOpenSettings: () => void;
  settingsVersion: number;
}

export default function TimerScreen({ onOpenSettings, settingsVersion }: Props) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isIntervalRunning, setIsIntervalRunning] = useState(false);
  const [intervalRemaining, setIntervalRemaining] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionStatus>('undetermined');

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const endTimeRef = useRef(0);
  const intervalEndTimeRef = useRef(0);
  const mainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRunningRef = useRef(false);
  const isIntervalRunningRef = useRef(false);
  const isEndingRef = useRef(false);
  const isIntervalEndingRef = useRef(false);

  useEffect(() => {
    getSettings().then(s => {
      const prevLock = settingsRef.current.lockMode;
      settingsRef.current = s;
      setSettings(s);

      if (prevLock && !s.lockMode && isIntervalRunningRef.current) {
        // ロック解除＋インターバル中: UI状態を同期でまとめてリセットし、
        // 非ロック・スタート前の状態に即切り替える
        if (intervalTimerRef.current) { clearInterval(intervalTimerRef.current); intervalTimerRef.current = null; }
        isIntervalRunningRef.current = false;
        setIsIntervalRunning(false);
        setIntervalRemaining(0);
        setRemaining(s.initialMinutes * 60);
        // UI に影響しない非同期クリーンアップ
        clearIntervalEndTime();
        deactivateKeepAwake(WAKE_TAG);
      } else if (!isRunningRef.current && !isIntervalRunningRef.current) {
        setRemaining(s.initialMinutes * 60);
      }
    });
  }, [settingsVersion]);

  // 通知許可リクエスト＆現状取得（マウント時 1 回）
  useEffect(() => {
    (async () => {
      const status = await requestNotificationPermission();
      setNotifPermission(status);
    })();
  }, []);

  // 起動時・復帰時の状態リカバリ。endTime が経過済みなら追いつき API を実行する。
  const recoverState = React.useCallback(async () => {
    const et = await getEndTime();
    if (et) {
      if (et > Date.now()) {
        // タイマー継続中: 再開
        endTimeRef.current = et;
        isRunningRef.current = true;
        setIsRunning(true);
        await activateKeepAwakeAsync(WAKE_TAG);
        startMainCountdown();
        return;
      }
      // タイマー終了済み: 追いつき API 実行＋インターバル復元（必要時）
      const s = await getSettings();
      settingsRef.current = s;
      setSettings(s);
      if (s.token && s.secret && s.deviceId && s.endAction !== 'none') {
        try { await runAction(s.token, s.secret, s.deviceId, s.endAction); }
        catch { setApiError(actionErrorLabel(s.endAction)); }
      }
      await clearEndTime();
      await cancelTimerEndNotification();

      if (s.lockMode && s.intervalMinutes > 0) {
        const intervalEnd = et + s.intervalMinutes * 60 * 1000;
        if (intervalEnd > Date.now()) {
          // インターバル中: 残り時間で復元
          intervalEndTimeRef.current = intervalEnd;
          isIntervalRunningRef.current = true;
          setIsIntervalRunning(true);
          setIntervalRemaining(Math.round((intervalEnd - Date.now()) / 1000));
          await setIntervalEndTime(intervalEnd);
          await activateKeepAwakeAsync(WAKE_TAG);
          startIntervalCountdown();
          return;
        }
        // インターバルも経過済み: 初期状態へ
        await clearIntervalEndTime();
        setRemaining(s.initialMinutes * 60);
        return;
      }
      setRemaining(s.initialMinutes * 60);
      return;
    }
    // メインタイマー終了情報なし→インターバルだけ残っているケース
    const iet = await getIntervalEndTime();
    if (iet && iet > Date.now()) {
      const s = await getSettings();
      if (!s.lockMode) {
        await clearIntervalEndTime();
        return;
      }
      intervalEndTimeRef.current = iet;
      isIntervalRunningRef.current = true;
      setIsIntervalRunning(true);
      setIntervalRemaining(Math.round((iet - Date.now()) / 1000));
      await activateKeepAwakeAsync(WAKE_TAG);
      startIntervalCountdown();
    } else if (iet) {
      await clearIntervalEndTime();
    }
  }, []);

  useEffect(() => {
    recoverState();
    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
      if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    };
  }, [recoverState]);

  // フォアグラウンド復帰時にも追いつき処理を再実行
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        // 通知許可ステータスを再取得（iOS 設定画面で変更された場合に追従）
        getNotificationPermission().then(setNotifPermission).catch(() => {});
        // 二重実行防止: 既に running 状態でなければリカバリ実行
        if (!isRunningRef.current && !isIntervalRunningRef.current) {
          recoverState();
        } else if (isRunningRef.current && endTimeRef.current <= Date.now()) {
          // 走行中だが時刻過ぎ: 終了処理
          handleMainTimerEnd();
        }
      }
    });
    return () => sub.remove();
  }, [recoverState]);

  function startMainCountdown() {
    if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    mainTimerRef.current = setInterval(() => {
      const rem = Math.round((endTimeRef.current - Date.now()) / 1000);
      if (rem <= 0) { setRemaining(0); handleMainTimerEnd(); }
      else setRemaining(rem);
    }, 500);
  }

  async function handleMainTimerEnd() {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    if (mainTimerRef.current) { clearInterval(mainTimerRef.current); mainTimerRef.current = null; }

    const s = settingsRef.current;
    const willStartInterval = s.lockMode && s.intervalMinutes > 0;

    Vibration.vibrate([0, 500, 200, 500, 200, 500]);
    // 前景で終了処理に到達したので、予約済み通知は不要
    cancelTimerEndNotification();

    if (willStartInterval) {
      // フラッシュ防止: UI状態を同期で一括切替してからストレージ・API処理を後ろに回す
      const durationSec = s.intervalMinutes * 60;
      const et = Date.now() + durationSec * 1000;
      intervalEndTimeRef.current = et;
      isRunningRef.current = false;
      isIntervalRunningRef.current = true;
      setIsRunning(false);
      setIsIntervalRunning(true);
      setIntervalRemaining(durationSec);
      startIntervalCountdown();
      isEndingRef.current = false;

      // ストレージ整合性のため clearEndTime → setIntervalEndTime の順
      (async () => {
        await clearEndTime();
        await setIntervalEndTime(et);
      })();

      if (s.token && s.secret && s.deviceId && s.endAction !== 'none') {
        runAction(s.token, s.secret, s.deviceId, s.endAction)
          .catch(() => setApiError(actionErrorLabel(s.endAction)));
      }
    } else {
      // インターバル無し: 停止して初期値に戻す
      isRunningRef.current = false;
      setIsRunning(false);
      setRemaining(s.initialMinutes * 60);
      isEndingRef.current = false;

      await clearEndTime();
      deactivateKeepAwake(WAKE_TAG);

      if (s.token && s.secret && s.deviceId && s.endAction !== 'none') {
        try { await runAction(s.token, s.secret, s.deviceId, s.endAction); }
        catch { setApiError(actionErrorLabel(s.endAction)); }
      }
    }
  }

  // 設定値を再読み込みして settingsRef/state を最新化。
  // ボタン操作のタイミングで呼び、警告残り時間など設定変更を即時反映させる。
  async function reloadSettings(): Promise<Settings> {
    const s = await getSettings();
    settingsRef.current = s;
    setSettings(s);
    return s;
  }

  async function handleStart() {
    const s = await reloadSettings();
    if (!s.token || !s.secret || !s.deviceId) {
      Alert.alert('設定が必要です', 'APIトークン・シークレット・デバイスIDを設定してください');
      return;
    }
    setApiError(null);
    if (s.startAction !== 'none') {
      try { await runAction(s.token, s.secret, s.deviceId, s.startAction); }
      catch { setApiError(actionErrorLabel(s.startAction)); return; }
    }

    const et = Date.now() + remaining * 1000;
    endTimeRef.current = et;
    await setEndTime(et);
    await activateKeepAwakeAsync(WAKE_TAG);
    isRunningRef.current = true;
    setIsRunning(true);
    startMainCountdown();
    // バックグラウンド到達時のためにローカル通知を予約
    scheduleTimerEndNotification(et, 'タイマーが終了しました。タップしてアプリを開いてください。')
      .catch(() => { /* 通知未許可時は無視 */ });
  }

  async function handleStop() {
    if (mainTimerRef.current) { clearInterval(mainTimerRef.current); mainTimerRef.current = null; }
    await cancelTimerEndNotification();
    await clearEndTime();
    deactivateKeepAwake(WAKE_TAG);
    isRunningRef.current = false;
    setIsRunning(false);
    setApiError(null);

    const s = settingsRef.current;
    if (s.token && s.secret && s.deviceId && s.endAction !== 'none') {
      try { await runAction(s.token, s.secret, s.deviceId, s.endAction); }
      catch { setApiError(actionErrorLabel(s.endAction)); }
    }
  }

  async function handleReset() {
    if (isRunningRef.current) await handleStop();
    const s = await reloadSettings();
    setRemaining(s.initialMinutes * 60);
  }

  function adjust(deltaSec: number) {
    const newRem = Math.max(0, remaining + deltaSec);
    setRemaining(newRem);
    if (isRunningRef.current) {
      const newEnd = Date.now() + newRem * 1000;
      endTimeRef.current = newEnd;
      setEndTime(newEnd);
      if (newRem === 0) {
        handleMainTimerEnd();
      } else {
        // 終了時刻が変わったので通知を再スケジュール
        scheduleTimerEndNotification(newEnd, 'タイマーが終了しました。タップしてアプリを開いてください。')
          .catch(() => { /* 通知未許可時は無視 */ });
      }
    }
    // 警告残り時間など設定変更を即時反映させるためバックグラウンドで再読み込み
    reloadSettings();
  }

  async function beginIntervalTimer(durationSec: number) {
    const et = Date.now() + durationSec * 1000;
    intervalEndTimeRef.current = et;
    await setIntervalEndTime(et);
    await activateKeepAwakeAsync(WAKE_TAG);
    isIntervalRunningRef.current = true;
    setIsIntervalRunning(true);
    setIntervalRemaining(durationSec);
    startIntervalCountdown();
  }

  function startIntervalCountdown() {
    if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
    intervalTimerRef.current = setInterval(() => {
      const rem = Math.round((intervalEndTimeRef.current - Date.now()) / 1000);
      if (rem <= 0) { setIntervalRemaining(0); handleIntervalEnd(); }
      else setIntervalRemaining(rem);
    }, 500);
  }

  async function handleIntervalEnd() {
    if (isIntervalEndingRef.current) return;
    isIntervalEndingRef.current = true;
    if (intervalTimerRef.current) { clearInterval(intervalTimerRef.current); intervalTimerRef.current = null; }
    await clearIntervalEndTime();
    deactivateKeepAwake(WAKE_TAG);
    isIntervalRunningRef.current = false;
    setIsIntervalRunning(false);
    isIntervalEndingRef.current = false;
    setRemaining(settingsRef.current.initialMinutes * 60);
    Vibration.vibrate([0, 300, 200, 300]);
  }

  async function stopIntervalTimer() {
    if (intervalTimerRef.current) { clearInterval(intervalTimerRef.current); intervalTimerRef.current = null; }
    await clearIntervalEndTime();
    deactivateKeepAwake(WAKE_TAG);
    isIntervalRunningRef.current = false;
    setIsIntervalRunning(false);
    setIntervalRemaining(0);
    setRemaining(settingsRef.current.initialMinutes * 60);
  }

  // ---- 表示ロジック ----
  const lock = settings.lockMode;
  const warningThreshold = settings.warningMinutes * 60;
  const isWarning = isRunning && remaining > 0 && remaining <= warningThreshold;

  const bgColor = isIntervalRunning ? '#FFF8DC'
    : isWarning ? '#8B0000'
    : '#111111';
  const onLight = isIntervalRunning;
  const textColor = onLight ? '#333' : '#fff';
  const subColor = onLight ? '#666' : '#aaa';
  const qs = settings.quickAdjustMinutes;

  const showAdjustButtons = !lock && !isIntervalRunning;
  const showReset = !lock && !isIntervalRunning;

  const baseFontSize = isLandscape ? 120 : 81;
  // ロック中カウントダウン時（ボタンなし）は1.3倍。adjustsFontSizeToFit で幅を超えたら自動縮小
  const timerFontSize = (lock && isRunning) ? Math.round(baseFontSize * 1.3) : baseFontSize;

  const timerArea = (
    <View style={styles.timerWrap}>
      {/* タイマーテキストのみ flex で中央固定。他ラベルは absolute で重ねる */}
      <Text
        style={[styles.timerText, {
          color: isIntervalRunning ? '#333' : textColor,
          fontSize: timerFontSize,
        }]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {fmt(isIntervalRunning ? intervalRemaining : remaining)}
      </Text>

      {/* 上部ラベル: absolute なのでタイマー位置に影響しない */}
      {(isRunning || isIntervalRunning || apiError) && (
        <Text style={[styles.timerLabelTop, {
          color: isIntervalRunning ? '#B8860B' : subColor,
        }]} numberOfLines={1}>
          {isIntervalRunning ? 'インターバル中' : isRunning ? actionRunningLabel(settings.startAction) : ''}
          {apiError && (
            <Text style={styles.errorLabel}>
              {(isRunning || isIntervalRunning) ? '  ' : ''}⚠ {apiError}
            </Text>
          )}
        </Text>
      )}

      {/* 下部ラベル: absolute なのでタイマー位置に影響しない */}
      {(isWarning || (lock && isRunning) || isIntervalRunning) && (
        <Text style={[styles.timerLabelBottom, {
          color: isWarning ? '#FFCDD2'
            : isIntervalRunning ? '#888'
            : subColor,
        }]}>
          {isWarning ? 'まもなく終了'
            : isIntervalRunning ? '次のスタートまでお待ちください'
            : '設定からロックを解除すると停止できます'}
        </Text>
      )}
    </View>
  );

  // 横向き用メインボタン（停止 / スタート / インターバル中グレー）
  const mainButton = (
    <>
      {isRunning && !lock && (
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#c0392b', width: 110, height: 110, borderRadius: 55 }]}
          onPress={handleStop}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainBtnText, { fontSize: 20 }]}>停止</Text>
        </TouchableOpacity>
      )}
      {!isRunning && !isIntervalRunning && (
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#27ae60', width: 110, height: 110, borderRadius: 55 }]}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={[styles.mainBtnText, { fontSize: 20 }]}>スタート</Text>
        </TouchableOpacity>
      )}
      {isIntervalRunning && !lock && (
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: '#555', width: 110, height: 110, borderRadius: 55 }]}
          activeOpacity={1}
        >
          <Text style={[styles.mainBtnText, { fontSize: 20 }]}>スタート</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // 縦向きボタンエリア
  const portraitButtonArea = (
    <>
      {showAdjustButtons && (
        <View style={styles.row}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => adjust(-qs * 60)}>
            <Text style={styles.quickBtnText}>－{qs}分</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => adjust(qs * 60)}>
            <Text style={styles.quickBtnText}>＋{qs}分</Text>
          </TouchableOpacity>
        </View>
      )}
      {showAdjustButtons && (
        <View style={styles.row}>
          {([{ label: '－1分', delta: -60 }, { label: '－10秒', delta: -10 },
            { label: '＋10秒', delta: 10 }, { label: '＋1分', delta: 60 }] as const).map(({ label, delta }) => (
            <TouchableOpacity key={label} style={styles.fineBtn} onPress={() => adjust(delta)}>
              <Text style={styles.fineBtnText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.buttonsRow}>
        {showReset && (
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.resetBtnIcon}>↺</Text>
            <Text style={styles.resetBtnLabel}>リセット</Text>
          </TouchableOpacity>
        )}
        {isRunning && !lock && (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: '#c0392b' }]}
            onPress={handleStop}
            activeOpacity={0.8}
          >
            <Text style={styles.mainBtnText}>停止</Text>
          </TouchableOpacity>
        )}
        {!isRunning && !isIntervalRunning && (
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: '#27ae60' }]}
            onPress={handleStart}
            activeOpacity={0.8}
          >
            <Text style={styles.mainBtnText}>スタート</Text>
          </TouchableOpacity>
        )}
        {isIntervalRunning && !lock && (
          <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#555' }]} activeOpacity={1}>
            <Text style={styles.mainBtnText}>スタート</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // 横向きボタンエリア：下段左＝調整ボタン、下段右＝メインボタン
  const landscapeButtonArea = (
    <View style={styles.landscapeBottom}>
      <View style={styles.landscapeAdjust}>
        {showAdjustButtons && (
          <>
            <View style={[styles.row, styles.rowCompact]}>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnCompact]} onPress={() => adjust(-qs * 60)}>
                <Text style={[styles.quickBtnText, styles.quickBtnTextCompact]}>－{qs}分</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, styles.quickBtnCompact]} onPress={() => adjust(qs * 60)}>
                <Text style={[styles.quickBtnText, styles.quickBtnTextCompact]}>＋{qs}分</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              {([{ label: '－1分', delta: -60 }, { label: '－10秒', delta: -10 },
                { label: '＋10秒', delta: 10 }, { label: '＋1分', delta: 60 }] as const).map(({ label, delta }) => (
                <TouchableOpacity key={label} style={[styles.fineBtn, styles.fineBtnCompact]} onPress={() => adjust(delta)}>
                  <Text style={[styles.fineBtnText, styles.fineBtnTextCompact]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>
      <View style={styles.landscapeButtons}>
        {showReset && (
          <TouchableOpacity
            style={[styles.resetBtn, { width: 76, height: 76, borderRadius: 38 }]}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <Text style={[styles.resetBtnIcon, { fontSize: 22 }]}>↺</Text>
            <Text style={[styles.resetBtnLabel, { fontSize: 10 }]}>リセット</Text>
          </TouchableOpacity>
        )}
        {mainButton}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar style={onLight ? 'dark' : 'light'} backgroundColor={bgColor} />

      <View style={styles.header}>
        <Text style={[styles.appTitle, { color: textColor }]}>BotTimer</Text>
        <TouchableOpacity onPress={onOpenSettings}>
          <Text style={[styles.settingsBtn, { color: onLight ? '#0077cc' : '#4FC3F7' }]}>設定</Text>
        </TouchableOpacity>
      </View>

      {/* 通知不許可時のみ警告バーを表示（タイマー作動中に限る） */}
      {notifPermission === 'denied' && isRunning && (
        <View style={styles.notifNoticeBar}>
          <Text style={styles.notifNoticeText}>
            通知が無効です。アプリを開いたままお使いください。
          </Text>
        </View>
      )}

      {timerArea}
      {isLandscape ? landscapeButtonArea : portraitButtonArea}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  appTitle: { fontSize: 20, fontWeight: 'bold' },
  settingsBtn: { fontSize: 16 },

  timerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  timerText: {
    fontSize: 76, fontWeight: '300', letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  timerLabelTop: {
    position: 'absolute',
    top: 24,
    left: 0, right: 0,
    textAlign: 'center',
    fontSize: 16, letterSpacing: 2,
  },
  errorLabel: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  timerLabelBottom: {
    position: 'absolute',
    bottom: 24,
    left: 0, right: 0,
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: 24,
  },

  row: {
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    marginBottom: 14, paddingHorizontal: 16,
  },
  rowCompact: { marginBottom: 8 },

  quickBtn: {
    backgroundColor: '#2a2a2a', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 20, minWidth: 120, alignItems: 'center',
  },
  quickBtnCompact: { paddingVertical: 10, paddingHorizontal: 14, minWidth: 90 },
  quickBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  quickBtnTextCompact: { fontSize: 16 },

  fineBtn: {
    backgroundColor: '#1e1e1e', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 8, minWidth: 62, alignItems: 'center',
  },
  fineBtnCompact: { paddingVertical: 7, paddingHorizontal: 6, minWidth: 52 },
  fineBtnText: { color: '#aaa', fontSize: 13 },
  fineBtnTextCompact: { fontSize: 11 },

  buttonsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 24, marginVertical: 28,
  },
  buttonsRowCompact: { marginVertical: 12, gap: 16 },

  resetBtn: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#333',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 6,
  },
  resetBtnIcon: { color: '#fff', fontSize: 28 },
  resetBtnLabel: { color: '#aaa', fontSize: 12, marginTop: 2 },

  mainBtn: {
    width: 150, height: 150, borderRadius: 75,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
  },
  mainBtnText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },

  landscapeBottom: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
  },
  landscapeAdjust: {
    flex: 1,
    justifyContent: 'center',
  },
  landscapeButtons: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  notifNoticeBar: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderColor: 'rgba(255, 165, 0, 0.5)',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  notifNoticeText: {
    color: '#FFB74D',
    fontSize: 12,
    textAlign: 'center',
  },
});
