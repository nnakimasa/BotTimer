import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeviceAction = 'on' | 'off' | 'none';

export interface Settings {
  token: string;
  secret: string;
  deviceId: string;
  deviceName: string;
  initialMinutes: number;
  quickAdjustMinutes: number;
  warningMinutes: number;
  lockMode: boolean;
  intervalMinutes: number;
  startAction: DeviceAction;
  endAction: DeviceAction;
}

export const DEFAULT_SETTINGS: Settings = {
  token: '',
  secret: '',
  deviceId: '',
  deviceName: '',
  initialMinutes: 60,
  quickAdjustMinutes: 5,
  warningMinutes: 5,
  lockMode: false,
  intervalMinutes: 15,
  startAction: 'on',
  endAction: 'off',
};

const SETTINGS_KEY = 'settings';
const END_TIME_KEY = 'end_time';

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
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
