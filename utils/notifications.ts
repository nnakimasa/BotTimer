import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const TIMER_NOTIFICATION_ID = 'bottimer-timer-end';

// 通知ハンドラ: 前景でも通知を表示する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('timer', {
    name: 'タイマー終了',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#27ae60',
  });
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'denied';
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (req.granted) return 'granted';
  return req.canAskAgain ? 'undetermined' : 'denied';
}

export async function getNotificationPermission(): Promise<NotificationPermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

// endTime（絶対ms）にタイマー終了通知を予約。既存の予約はキャンセルしてから新規登録する。
export async function scheduleTimerEndNotification(
  endTime: number,
  bodyText: string,
): Promise<void> {
  await cancelTimerEndNotification();
  const seconds = Math.max(1, Math.round((endTime - Date.now()) / 1000));
  await Notifications.scheduleNotificationAsync({
    identifier: TIMER_NOTIFICATION_ID,
    content: {
      title: 'BotTimer',
      body: bodyText,
      sound: 'default',
      // iOS の通知中央でも表示されるよう interruption level を時間制 (timeSensitive) に
      interruptionLevel: 'timeSensitive',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: 'timer',
    },
  });
}

export async function cancelTimerEndNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID);
  } catch {
    // 予約が存在しない場合はエラーになるが無視
  }
}
