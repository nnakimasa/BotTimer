import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Modal,
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
    if (!s.initialMinutes || s.initialMinutes <= 0) {
      Alert.alert('エラー', '初期タイマーは1以上の値を入力してください');
      return;
    }
    if (!s.quickAdjustMinutes || s.quickAdjustMinutes <= 0) {
      Alert.alert('エラー', 'クイック調整単位は1以上の値を入力してください');
      return;
    }
    if (s.lockMode && (!s.intervalMinutes || s.intervalMinutes <= 0)) {
      Alert.alert('エラー', 'インターバル時間は1以上の値を入力してください');
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
    if (!s.token || !s.secret) {
      Alert.alert('エラー', '先に SwitchBot API のトークンとシークレットを設定してください');
      return;
    }
    setLoading(true);
    try {
      const list = await getDevices(s.token, s.secret);
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

  const set = (key: keyof Settings, value: string) => {
    if (key === 'initialMinutes' || key === 'quickAdjustMinutes' || key === 'warningMinutes' || key === 'intervalMinutes') {
      setS(prev => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
    } else {
      setS(prev => ({ ...prev, [key]: value }));
    }
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
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>設定</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* SwitchBot API */}
        <Text style={styles.sectionLabel}>SwitchBot API</Text>
        <View style={styles.field}>
          <Text style={styles.label}>APIトークン / シークレット</Text>
          <View style={styles.readonlyRow}>
            <View style={[styles.readonlyBox, !apiConfigured && styles.readonlyBoxEmpty]}>
              <Text style={[styles.readonlyText, !apiConfigured && styles.readonlyTextEmpty]}>
                {apiConfigured ? '●●●●●●●●  設定済み' : '未設定'}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={openApiModal}>
              <Text style={styles.changeBtnText}>{apiConfigured ? '変更' : '設定'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* デバイス */}
        <View style={styles.field}>
          <Text style={styles.label}>デバイス</Text>
          <View style={styles.readonlyRow}>
            <View style={[styles.readonlyBox, !s.deviceId && styles.readonlyBoxEmpty]}>
              <Text style={[styles.readonlyText, !s.deviceId && styles.readonlyTextEmpty]} numberOfLines={1}>
                {deviceDisplay}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeBtn} onPress={handleFetchDevices} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.changeBtnText}>{s.deviceId ? '変更' : '選択'}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* 動作設定 */}
        <Text style={styles.sectionLabel}>動作設定</Text>
        <View style={styles.field}>
          <Text style={styles.label}>タイマー開始時</Text>
          <ActionSegment value={s.startAction} onChange={v => setS(prev => ({ ...prev, startAction: v }))} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>タイマー終了時 / 停止時</Text>
          <ActionSegment value={s.endAction} onChange={v => setS(prev => ({ ...prev, endAction: v }))} />
        </View>

        {/* タイマー設定 */}
        <Text style={styles.sectionLabel}>タイマー設定</Text>
        <Field label="初期タイマー（分）" value={String(s.initialMinutes)} onChange={v => set('initialMinutes', v)} numeric />
        <Field label="クイック調整単位（分）" value={String(s.quickAdjustMinutes)} onChange={v => set('quickAdjustMinutes', v)} numeric />
        <Field label="警告表示の残り時間（分）" value={String(s.warningMinutes)} onChange={v => set('warningMinutes', v)} numeric />

        {/* ロックモード */}
        <Text style={styles.sectionLabel}>ロックモード</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>ロックモード</Text>
            <Text style={styles.hint}>ONにすると途中停止・時間変更が不可になります</Text>
          </View>
          <Switch
            value={s.lockMode}
            onValueChange={v => setS(prev => ({ ...prev, lockMode: v }))}
            trackColor={{ false: '#333', true: '#27ae60' }}
            thumbColor="#fff"
          />
        </View>
        {s.lockMode && (
          <Field
            label="インターバル時間（分）"
            value={String(s.intervalMinutes)}
            onChange={v => set('intervalMinutes', v)}
            numeric
          />
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>保存</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* API認証モーダル */}
      <Modal visible={apiModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>

      {/* デバイス選択モーダル */}
      <Modal visible={deviceModalVisible} animationType="slide" transparent>
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

function Field({ label, value, onChange, placeholder, secure, numeric }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secure?: boolean; numeric?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#555"
        secureTextEntry={secure}
        keyboardType={numeric ? 'number-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function ActionSegment({ value, onChange }: { value: DeviceAction; onChange: (v: DeviceAction) => void }) {
  const options: Array<{ key: DeviceAction; label: string }> = [
    { key: 'on', label: 'ON' },
    { key: 'off', label: 'OFF' },
    { key: 'none', label: '操作なし' },
  ];
  return (
    <View style={styles.segment}>
      {options.map(opt => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.8}
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
  scroll: { flex: 1, padding: 20 },
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
});
