import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeviceAction = 'on' | 'off' | 'none';

export interface Settings {
  token: string;
  secret: string;
  deviceId: string;
  deviceName: string;
  initialSeconds: number;
  quickAdjustSeconds: number;
  warningSeconds: number;
  lockMode: boolean;
  intervalSeconds: number;
  startAction: DeviceAction;
  endAction: DeviceAction;
  demoMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  token: '',
  secret: '',
  deviceId: '',
  deviceName: '',
  initialSeconds: 60 * 60,        // 1時間
  quickAdjustSeconds: 5 * 60,     // 5分
  warningSeconds: 5 * 60,         // 5分
  lockMode: false,
  intervalSeconds: 15 * 60,       // 15分
  startAction: 'on',
  endAction: 'off',
  demoMode: false,
};

const SETTINGS_KEY = 'settings';
const END_TIME_KEY = 'end_time';

// 旧形式（*Minutes）から新形式（*Seconds）への自動移行。
// 既存のローカルデータを失わせず、初回読み込み時に変換して保存し直す。
function migrateLegacyMinutes(raw: Record<string, unknown>): Record<string, unknown> {
  const migrated = { ...raw };
  const pairs: Array<[string, string]> = [
    ['initialMinutes', 'initialSeconds'],
    ['quickAdjustMinutes', 'quickAdjustSeconds'],
    ['warningMinutes', 'warningSeconds'],
    ['intervalMinutes', 'intervalSeconds'],
  ];
  for (const [oldKey, newKey] of pairs) {
    if (migrated[newKey] === undefined && typeof migrated[oldKey] === 'number') {
      migrated[newKey] = (migrated[oldKey] as number) * 60;
    }
    delete migrated[oldKey];
  }
  return migrated;
}

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  const parsed = JSON.parse(raw);
  const migrated = migrateLegacyMinutes(parsed);
  return { ...DEFAULT_SETTINGS, ...migrated };
}

export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export async function getEndTime(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(END_TIME_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export async function setEndTime(t: number): Promise<void> {
  await AsyncStorage.setItem(END_TIME_KEY, t.toString());
}

export async function clearEndTime(): Promise<void> {
  await AsyncStorage.removeItem(END_TIME_KEY);
}

const INTERVAL_END_TIME_KEY = 'interval_end_time';

export async function getIntervalEndTime(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(INTERVAL_END_TIME_KEY);
  return raw ? parseInt(raw, 10) : null;
}

export async function setIntervalEndTime(t: number): Promise<void> {
  await AsyncStorage.setItem(INTERVAL_END_TIME_KEY, t.toString());
}

export async function clearIntervalEndTime(): Promise<void> {
  await AsyncStorage.removeItem(INTERVAL_END_TIME_KEY);
}
