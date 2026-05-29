import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DEFAULT_SETTINGS, DeviceAction, getSettings, saveSettings, Settings } from '../utils/storage';
import { getDevices, SwitchBotDevice } from '../utils/switchbot';
import DurationField from '../components/DurationField';

interface Props {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: Props) {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [devices, setDevices] = useState<SwitchBotDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInfrared, setShowInfrared] = useState(false);

  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [apiDraftToken, setApiDraftToken] = useState('');
  const [apiDraftSecret, setApiDraftSecret] = useState('');

  // Reduce Motion 設定を取得してモーダルのアニメーションを制御
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  const modalAnimation = reduceMotion ? 'fade' : 'slide';

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (apiModalVisible) { setApiModalVisible(false); return true; }
      if (deviceModalVisible) { setDeviceModalVisible(false); return true; }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack, apiModalVisible, deviceModalVisible]);

  const handleSave = async () => {
    if (!s.initialSeconds || s.initialSeconds <= 0) {
      Alert.alert('エラー', '初期タイマーは 0 より長い時間を設定してください');
      return;
    }
    if (!s.quickAdjustSeconds || s.quickAdjustSeconds <= 0) {
      Alert.alert('エラー', 'クイック調整単位は 0 より長い時間を設定してください');
      return;
    }
    if (s.lockMode && (!s.intervalSeconds || s.intervalSeconds <= 0)) {
      Alert.alert('エラー', 'インターバル時間は 0 より長い時間を設定してください');
      return;
    }
    await saveSettings(s);
    Alert.alert('保存しました', '', [{ text: 'OK', onPress: onBack }]);
  };

  const openApiModal = () => {
    setApiDraftToken(s.token);
    setApiDraftSecret(s.secret);
    setApiModalVisible(true);
  };

  const handleApiModalSave = () => {
    setS(prev => ({ ...prev, token: apiDraftToken.trim(), secret: apiDraftSecret.trim() }));
    setApiModalVisible(false);
  };

  const handleFetchDevices = async () => {
    if (!s.demoMode && (!s.token || !s.secret)) {
      Alert.alert('エラー', '先に SwitchBot API のトークンとシークレットを設定してください');
      return;
    }
    setLoading(true);
    try {
      const list = await getDevices(s.token, s.secret, s.demoMode);
      const visible = list.filter(d => d.category !== 'unsupported');
      if (visible.length === 0) {
        Alert.alert('対応デバイスがありません', 'このアプリで操作可能な SwitchBot デバイスが見つかりませんでした。');
      } else {
        setDevices(list);
        setShowInfrared(false); // モーダルを開くたびに OFF 始まり
        setDeviceModalVisible(true);
      }
    } catch {
      Alert.alert('エラー', 'デバイス一覧の取得に失敗しました。トークンとシークレットを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDevice = (device: SwitchBotDevice) => {
    setS(prev => ({ ...prev, deviceId: device.deviceId, deviceName: device.deviceName }));
    setDeviceModalVisible(false);
  };

  const handleHelpNotifications = () => {
    Alert.alert(
      '通知が届かないとき',
      'iOS の集中モード（おやすみモード等）が ON の場合、タイマー終了の通知が抑制されることがあります。\n\n▼ 解消方法\niPhone「設定」→「集中モード」→ 現在のモードを開く →「アプリ」→ BotTimer を「許可」に追加\n\n詳しい FAQ はサポートページをご覧ください。',
      [
        { text: '閉じる', style: 'cancel' },
        { text: 'サポートページを開く', onPress: () => Linking.openURL('https://nnakimasa.github.io/bottimer-privacy/support.html') },
      ],
    );
  };

  const setDurationField = (
    key: 'initialSeconds' | 'quickAdjustSeconds' | 'warningSeconds' | 'intervalSeconds',
    value: number,
  ) => {
    setS(prev => ({ ...prev, [key]: value }));
  };

  const visibleDevices = useMemo(
    () => devices.filter(d => d.category === 'supported' || (showInfrared && d.category === 'infrared')),
    [devices, showInfrared],
  );

  const apiConfigured = !!(s.token && s.secret);
  const deviceDisplay = s.deviceName
    ? s.deviceName
    : s.deviceId
      ? `ID: ${s.deviceId}`
      : '未選択';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#111" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          accessibilityHint="設定を保存せずタイマー画面に戻ります"
        >
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">設定</Text>
        <View style={styles.spacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.kbAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* SwitchBot API */}
        <Text style={styles.sectionLabel} accessibilityRole="header">SwitchBot API</Text>
        <View style={styles.field}>
          <Text style={styles.label}>APIトークン / シークレット</Text>
          <View style={styles.readonlyRow}>
            <View
              style={[styles.readonlyBox, !apiConfigured && styles.readonlyBoxEmpty]}
              accessible
              accessibilityLabel={`APIトークン・シークレット ${apiConfigured ? '設定済み' : '未設定'}`}
            >
              <Text style={[styles.readonlyText, !apiConfigured && styles.readonlyTextEmpty]}>
                {apiConfigured ? '●●●●●●●●  設定済み' : '未設定'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={openApiModal}
              accessibilityRole="button"
              accessibilityLabel={apiConfigured ? 'APIトークン・シークレットを変更' : 'APIトークン・シークレットを設定'}
              accessibilityHint="入力モーダルを開きます"
            >
              <Text style={styles.changeBtnText}>{apiConfigured ? '変更' : '設定'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* デバイス */}
        <View style={styles.field}>
          <Text style={styles.label}>デバイス</Text>
          <View style={styles.readonlyRow}>
            <View
              style={[styles.readonlyBox, !s.deviceId && styles.readonlyBoxEmpty]}
              accessible
              accessibilityLabel={`選択中のデバイス ${deviceDisplay}`}
            >
              <Text style={[styles.readonlyText, !s.deviceId && styles.readonlyTextEmpty]} numberOfLines={1}>
                {deviceDisplay}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={handleFetchDevices}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={s.deviceId ? 'デバイスを変更' : 'デバイスを選択'}
              accessibilityHint="SwitchBot のデバイス一覧を取得します"
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.changeBtnText}>{s.deviceId ? '変更' : '選択'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* 動作設定 */}
        <Text style={styles.sectionLabel} accessibilityRole="header">動作設定</Text>
        <View style={styles.field}>
          <Text style={styles.label}>タイマー開始時</Text>
          <ActionSegment
            value={s.startAction}
            onChange={v => setS(prev => ({ ...prev, startAction: v }))}
            groupLabel="タイマー開始時の動作"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>タイマー終了時 / 停止時</Text>
          <ActionSegment
            value={s.endAction}
            onChange={v => setS(prev => ({ ...prev, endAction: v }))}
            groupLabel="タイマー終了時・停止時の動作"
          />
        </View>

        {/* タイマー設定 */}
        <Text style={styles.sectionLabel} accessibilityRole="header">タイマー設定</Text>
        <DurationField
          label="初期タイマー"
          value={s.initialSeconds}
          onChange={v => setDurationField('initialSeconds', v)}
          minSeconds={1}
          reduceMotion={reduceMotion}
        />
        <DurationField
          label="クイック調整単位"
          value={s.quickAdjustSeconds}
          onChange={v => setDurationField('quickAdjustSeconds', v)}
          minSeconds={1}
          hint="メイン画面の大きい +/- ボタンで増減する単位"
          reduceMotion={reduceMotion}
        />
        <DurationField
          label="警告表示の残り時間"
          value={s.warningSeconds}
          onChange={v => setDurationField('warningSeconds', v)}
          hint="この時間を切ると画面が赤く表示されます"
          reduceMotion={reduceMotion}
        />

        {/* ロックモード */}
        <Text style={styles.sectionLabel} accessibilityRole="header">ロックモード</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>ロックモード</Text>
            <Text style={styles.hint}>ONにすると途中停止・時間変更が不可になります</Text>
          </View>
          <Switch
            value={s.lockMode}
            onValueChange={v => setS(prev => ({ ...prev, lockMode: v }))}
            trackColor={{ false: '#333', true: '#27ae60' }}
            thumbColor="#fff"
            accessibilityLabel="ロックモード"
            accessibilityHint="ONにすると途中停止・時間変更が不可になります"
          />
        </View>
        {s.lockMode && (
          <DurationField
            label="インターバル時間"
            value={s.intervalSeconds}
            onChange={v => setDurationField('intervalSeconds', v)}
            minSeconds={1}
            reduceMotion={reduceMotion}
          />
        )}

        {/* デモモード */}
        <Text style={styles.sectionLabel} accessibilityRole="header">デモモード</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.label}>デモモード</Text>
            <Text style={styles.hint}>
              ONにすると、SwitchBot 機器なしでアプリの動作を試せます。API 通信は行われません。
            </Text>
          </View>
          <Switch
            value={s.demoMode}
            onValueChange={v => setS(prev => ({ ...prev, demoMode: v }))}
            trackColor={{ false: '#333', true: '#FFB74D' }}
            thumbColor="#fff"
            accessibilityLabel="デモモード"
            accessibilityHint="ONにすると API 通信を行わずアプリ単独で動作確認できます"
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="設定を保存"
          accessibilityHint="入力した設定を保存してタイマー画面に戻ります"
        >
          <Text style={styles.saveBtnText}>保存</Text>
        </TouchableOpacity>

        {/* アプリについて */}
        <Text style={styles.sectionLabel} accessibilityRole="header">アプリについて</Text>
        <View style={styles.aboutBox} accessible accessibilityRole="text">
          <Text style={styles.aboutText}>
            本アプリは SwitchBot 社の公式アプリではありません。同社が提供する公開 API を用いた個人開発の非公式アプリです。
          </Text>
          <Text style={styles.aboutTextMuted}>
            SwitchBot は SwitchBot 社の商標です。
          </Text>
        </View>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={handleHelpNotifications}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="通知が届かないときの対処方法"
          accessibilityHint="集中モードで通知が抑制される場合の解消方法を表示します"
        >
          <Text style={styles.linkText}>通知が届かないとき</Text>
          <Text style={styles.linkArrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL('https://nnakimasa.github.io/bottimer-privacy/')}
          activeOpacity={0.7}
          accessibilityRole="link"
          accessibilityLabel="プライバシーポリシーを開く"
          accessibilityHint="外部ブラウザでプライバシーポリシーのページを開きます"
        >
          <Text style={styles.linkText}>プライバシーポリシー</Text>
          <Text style={styles.linkArrow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">↗</Text>
        </TouchableOpacity>
        <View style={styles.versionRow}>
          <Text style={styles.versionText} accessibilityLabel="バージョン 1.0.0">BotTimer v1.0.0</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* API認証モーダル */}
      <Modal visible={apiModalVisible} animationType={modalAnimation} transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SwitchBot API 認証情報</Text>
              <TouchableOpacity onPress={() => setApiModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.apiModalBody} keyboardShouldPersistTaps="handled">
              <View style={styles.field}>
                <Text style={styles.label}>APIトークン</Text>
                <TextInput
                  style={styles.input}
                  value={apiDraftToken}
                  onChangeText={setApiDraftToken}
                  placeholder="Token"
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>APIシークレット</Text>
                <TextInput
                  style={styles.input}
                  value={apiDraftSecret}
                  onChangeText={setApiDraftSecret}
                  placeholder="Secret"
                  placeholderTextColor="#555"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.hint}>「保存」を押すまで設定には反映されません。</Text>
            </ScrollView>

            <View style={styles.apiModalFooter}>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalCancelBtn]}
                onPress={() => setApiModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalFooterBtn, styles.modalSaveBtn]}
                onPress={handleApiModalSave}
              >
                <Text style={styles.modalSaveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* デバイス選択モーダル */}
      <Modal visible={deviceModalVisible} animationType={modalAnimation} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>デバイスを選択</Text>
              <TouchableOpacity onPress={() => setDeviceModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalToggleLabel}>赤外線リモコンも表示</Text>
                <Text style={styles.modalToggleHint}>※動作保証はありません</Text>
              </View>
              <Switch
                value={showInfrared}
                onValueChange={setShowInfrared}
                trackColor={{ false: '#333', true: '#2563EB' }}
                thumbColor="#fff"
              />
            </View>

            {visibleDevices.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  {showInfrared
                    ? '対応デバイスが見つかりません'
                    : '対応デバイスが見つかりません。赤外線リモコンを表示するには上のスイッチをONにしてください。'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={visibleDevices}
                keyExtractor={item => item.deviceId}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.deviceItem} onPress={() => handleSelectDevice(item)}>
                    <View style={styles.deviceHeader}>
                      <Text style={styles.deviceName}>{item.deviceName}</Text>
                      {item.category === 'infrared' && (
                        <>
                          <Text style={styles.deviceBadge}>赤外線</Text>
                          <Text style={styles.deviceWarning}>※動作保証なし</Text>
                        </>
                      )}
                    </View>
                    <Text style={styles.deviceType}>{item.deviceType}</Text>
                    <Text style={styles.deviceIdText}>{item.deviceId}</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionSegment({ value, onChange, groupLabel }: {
  value: DeviceAction;
  onChange: (v: DeviceAction) => void;
  groupLabel?: string;
}) {
  const options: Array<{ key: DeviceAction; label: string }> = [
    { key: 'on', label: 'ON' },
    { key: 'off', label: 'OFF' },
    { key: 'none', label: '操作なし' },
  ];
  return (
    <View
      style={styles.segment}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
    >
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: active, checked: active }}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  backBtn: { width: 70 },
  backText: { color: '#4FC3F7', fontSize: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  spacer: { width: 70 },
  kbAvoid: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  sectionLabel: {
    color: '#4FC3F7', fontSize: 12, fontWeight: '700',
    letterSpacing: 1, marginBottom: 12, marginTop: 8,
  },
  field: { marginBottom: 20 },
  label: { color: '#999', fontSize: 13, marginBottom: 8 },
  hint: { color: '#666', fontSize: 11, marginTop: 2 },
  input: {
    backgroundColor: '#1e1e1e', color: '#fff', padding: 14,
    borderRadius: 10, borderWidth: 1, borderColor: '#333', fontSize: 15,
  },
  readonlyRow: { flexDirection: 'row', gap: 8 },
  readonlyBox: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  readonlyBoxEmpty: { borderStyle: 'dashed' },
  readonlyText: { color: '#ddd', fontSize: 15 },
  readonlyTextEmpty: { color: '#666' },
  changeBtn: {
    backgroundColor: '#2563EB', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', minWidth: 64,
  },
  changeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e1e1e', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#333', marginBottom: 20,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#2563EB',
  },
  segmentText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  saveBtn: {
    backgroundColor: '#27ae60', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8, marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1e1e1e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalClose: { color: '#aaa', fontSize: 20 },
  apiModalBody: { paddingHorizontal: 20, paddingTop: 20 },
  apiModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalFooterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtn: { backgroundColor: '#333' },
  modalCancelText: { color: '#ddd', fontSize: 15, fontWeight: '600' },
  modalSaveBtn: { backgroundColor: '#2563EB' },
  modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  modalToggleLabel: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  modalToggleHint: { color: '#777', fontSize: 11, marginTop: 2 },
  emptyWrap: { padding: 24 },
  emptyText: { color: '#888', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  deviceItem: { padding: 18 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deviceBadge: {
    color: '#FFB74D', fontSize: 10, fontWeight: '700',
    borderWidth: 1, borderColor: '#FFB74D', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  deviceType: { color: '#888', fontSize: 13, marginTop: 2 },
  deviceIdText: { color: '#555', fontSize: 11, marginTop: 2 },
  deviceWarning: { color: '#FFB74D', fontSize: 11 },
  separator: { height: 1, backgroundColor: '#2a2a2a' },

  aboutBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 14,
    marginBottom: 12,
  },
  aboutText: {
    color: '#bbb',
    fontSize: 12,
    lineHeight: 18,
  },
  aboutTextMuted: {
    color: '#666',
    fontSize: 11,
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  linkText: { color: '#4FC3F7', fontSize: 14, fontWeight: '600' },
  linkArrow: { color: '#4FC3F7', fontSize: 14 },
  versionRow: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 40,
  },
  versionText: { color: '#888', fontSize: 13 },
});
