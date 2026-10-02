import { AlertRule, TenderItem, TenderAlertNotification } from '../types/tender';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-civil',
    keyword: 'civil works',
    enabled: true,
    color: '#d97706', // amber
    soundEnabled: true,
    desktopNotify: true,
  },
  {
    id: 'rule-it',
    keyword: 'it infrastructure',
    enabled: true,
    color: '#4f46e5', // indigo
    soundEnabled: true,
    desktopNotify: true,
  },
  {
    id: 'rule-solar',
    keyword: 'solar',
    enabled: true,
    color: '#059669', // emerald
    soundEnabled: true,
    desktopNotify: true,
  },
  {
    id: 'rule-hospital',
    keyword: 'hospital',
    enabled: true,
    color: '#e11d48', // rose
    soundEnabled: true,
    desktopNotify: true,
  },
  {
    id: 'rule-water',
    keyword: 'water supply',
    enabled: true,
    color: '#0284c7', // sky
    soundEnabled: false,
    desktopNotify: true,
  }
];

// Play a pleasant chime using Web Audio API (synthesized - zero external file needed)
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second tone slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio might be blocked by browser autoplay policy
    console.debug('Audio chime skipped:', e);
  }
}

// Request desktop notification permission
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return 'denied';
  }
}

// Trigger browser native desktop notification
export function triggerDesktopNotification(
  title: string,
  options?: NotificationOptions,
  onClick?: () => void
): Notification | null {
  if (!('Notification' in window)) return null;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
      return notification;
    } catch (e) {
      console.warn('Failed to fire desktop notification:', e);
      return null;
    }
  }
  return null;
}

// Check tender against enabled rules
export function findMatchingAlertKeywords(tender: TenderItem, rules: AlertRule[]): string[] {
  const activeRules = rules.filter(r => r.enabled);
  if (activeRules.length === 0) return [];

  const searchableText = `${tender.title} ${tender.workDescription} ${tender.category} ${tender.organization} ${tender.department}`.toLowerCase();

  const matched: string[] = [];

  for (const rule of activeRules) {
    const kw = rule.keyword.toLowerCase().trim();
    if (!kw) continue;

    // Check budget minimum if set
    if (rule.minBudgetInr && tender.estimatedBudgetInr < rule.minBudgetInr) {
      continue;
    }

    // Match exact phrase or individual words
    if (searchableText.includes(kw)) {
      matched.push(rule.keyword);
    }
  }

  return Array.from(new Set(matched));
}
