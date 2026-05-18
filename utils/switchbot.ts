import CryptoJS from 'crypto-js';
import { DeviceAction } from './storage';

const BASE_URL = 'https://api.switch-bot.com/v1.1';

export type DeviceCategory = 'supported' | 'infrared' | 'unsupported';

export interface SwitchBotDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  isInfrared: boolean;
  category: DeviceCategory;
}

// turnOn / turnOff の双方を素直にサポートする物理デバイス。
// SwitchBot API v1.1 で「電源/動作の入切」が自然に対応する deviceType のみを含める。
export const SUPPORTED_DEVICE_TYPES: ReadonlySet<string> = new Set([
  'Plug',
  'Plug Mini (US)',
  'Plug Mini (JP)',
  'Relay Switch 1',
  'Relay Switch 1PM',
  'Relay Switch 2PM',
  'Color Bulb',
  'Strip Light',
  'Strip Light 3',
  'Ceiling Light',
  'Ceiling Light Pro',
  'Floor Lamp',
  'Humidifier',
  'Humidifier2',
  'Air Purifier',
  'Air Purifier Table',
  'Battery Circulator Fan',
  'Circulator Fan',
]);

// 赤外線リモコン経由のデバイス。動作保証はしないが、ユーザーが望めば一覧に表示する。
export const SUPPORTED_REMOTE_TYPES: ReadonlySet<string> = new Set([
  'Light',
  'Fan',
  'DIY Fan',
  'Air Conditioner',
  'DIY Air Conditioner',
  'TV',
  'IPTV',
  'Set Top Box',
  'DVD',
  'Speaker',
  'Air Purifier',
  'DIY Air Purifier',
  'Water Heater',
  'DIY Water Heater',
  'Vacuum Cleaner',
  'DIY Vacuum Cleaner',
  'Others',
]);

function buildHeaders(token: string, secret: string) {
  const t = Date.now().toString();
  const nonce = Math.random().toString(36).substring(2, 15);
  const sign = CryptoJS.HmacSHA256(token + t + nonce, secret).toString(CryptoJS.enc.Base64);
  return {
    Authorization: token,
    sign,
    t,
    nonce,
    'Content-Type': 'application/json',
  };
}

async function sendCommand(
  token: string,
  secret: string,
  deviceId: string,
  command: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/devices/${deviceId}/commands`, {
    method: 'POST',
    headers: buildHeaders(token, secret),
    body: JSON.stringify({ command, parameter: 'default', commandType: 'command' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export const turnOn = (token: string, secret: string, deviceId: string) =>
  sendCommand(token, secret, deviceId, 'turnOn');

export const turnOff = (token: string, secret: string, deviceId: string) =>
  sendCommand(token, secret, deviceId, 'turnOff');

// 'none' のときは API 呼び出しを行わない。エラー処理は呼び出し側に委ねる。
export async function runAction(
  token: string,
  secret: string,
  deviceId: string,
  action: DeviceAction,
): Promise<void> {
  if (action === 'none') return;
  await sendCommand(token, secret, deviceId, action === 'on' ? 'turnOn' : 'turnOff');
}

function classify(deviceType: string, isInfrared: boolean): DeviceCategory {
  if (isInfrared) {
    return SUPPORTED_REMOTE_TYPES.has(deviceType) ? 'infrared' : 'unsupported';
  }
  return SUPPORTED_DEVICE_TYPES.has(deviceType) ? 'supported' : 'unsupported';
}

export async function getDevices(token: string, secret: string): Promise<SwitchBotDevice[]> {
  const res = await fetch(`${BASE_URL}/devices`, {
    headers: buildHeaders(token, secret),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const physical = (json.body?.deviceList ?? []) as Array<{
    deviceId: string;
    deviceName: string;
    deviceType: string;
  }>;
  const infrared = (json.body?.infraredRemoteList ?? []) as Array<{
    deviceId: string;
    deviceName: string;
    remoteType: string;
  }>;

  const physicalDevices: SwitchBotDevice[] = physical.map(d => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    deviceType: d.deviceType,
    isInfrared: false,
    category: classify(d.deviceType, false),
  }));
  const infraredDevices: SwitchBotDevice[] = infrared.map(d => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName,
    deviceType: d.remoteType,
    isInfrared: true,
    category: classify(d.remoteType, true),
  }));

  return [...physicalDevices, ...infraredDevices];
}
