// localNotifications.ts
// Best-effort wrapper that uses Capacitor Local Notifications on native
// and falls back to Web Notification API on the web.

export const isNative = typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform && (window as any).Capacitor.isNativePlatform();

type NotifyPermission = 'granted' | 'denied' | 'prompt' | 'default';

const requestPermission = async (): Promise<NotifyPermission> => {
  if (isNative) {
    try {
      // dynamic import to avoid bundler issues
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LocalNotifications } = require('@capacitor/local-notifications');
      // Some native platforms require a runtime request
      if (LocalNotifications && typeof LocalNotifications.requestPermission === 'function') {
        const granted = await LocalNotifications.requestPermission();
        // Plugin may return { value: true } or boolean
        if (typeof granted === 'object' && 'value' in granted) {
          return granted.value ? 'granted' : 'denied';
        }
        return granted ? 'granted' : 'denied';
      }
    } catch (e) {
      console.warn('Capacitor LocalNotifications requestPermission failed', e);
    }
  }

  // Web fallback
  if (typeof Notification !== 'undefined' && Notification.requestPermission) {
    const p = await Notification.requestPermission();
    return (p || 'default') as NotifyPermission;
  }

  return 'denied';
};

const schedule = async (opts: { id?: number; title: string; body?: string; scheduleAt?: Date }) => {
  if (isNative) {
    try {
      const { LocalNotifications } = require('@capacitor/local-notifications');
      const scheduleAt = opts.scheduleAt || new Date();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: opts.id || Date.now(),
            title: opts.title,
            body: opts.body || '',
            schedule: { at: scheduleAt },
          },
        ],
      } as any);
      return true;
    } catch (e) {
      console.warn('LocalNotifications.schedule failed', e);
    }
  }

  // Web fallback: immediate notification if permission granted
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n: any = new Notification(opts.title, { body: opts.body });
      // Return the notification instance so callers can manage it (close it when audio ends)
      return n;
    }
  } catch (e) {
    console.warn('Web Notification schedule failed', e);
  }

  return false;
};

export default { requestPermission, schedule };
