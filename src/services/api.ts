import { TenderItem, AlertRule, TenderAlertNotification, ScraperLogMessage, TenderAiAnalysis } from '../types/tender';

export interface PortalCheckResult {
  success: boolean;
  url: string;
  status: number;
  statusText: string;
  latencyMs: number;
  serverHeader?: string;
  contentType?: string;
  hasGePNICSignature?: boolean;
  reachable: boolean;
  isGeoblockedOrProtected?: boolean;
  note?: string;
}

export interface BackendHealth {
  status: string;
  mode: string;
  uptimeSeconds: number;
  databaseCount: number;
  activeAlertRules: number;
  notificationsCount: number;
  scraperLogsCount?: number;
  bookmarkedCount?: number;
  hasAiEngine?: boolean;
  timestamp: string;
}

export async function checkBackendHealth(): Promise<BackendHealth | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchLiveTenders(params?: {
  search?: string;
  state?: string;
  category?: string;
  minBudget?: number;
  onlyAlerts?: boolean;
  onlyBookmarked?: boolean;
  sortBy?: string;
}): Promise<{ total: number; databaseSize: number; bookmarkedCount?: number; tenders: TenderItem[] }> {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.state && params.state !== 'ALL') query.set('state', params.state);
    if (params?.category && params.category !== 'ALL') query.set('category', params.category);
    if (params?.minBudget) query.set('minBudget', String(params.minBudget));
    if (params?.onlyAlerts) query.set('onlyAlerts', 'true');
    if (params?.onlyBookmarked) query.set('onlyBookmarked', 'true');
    if (params?.sortBy) query.set('sortBy', params.sortBy);

    const res = await fetch(`/api/tenders?${query.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend fetch failed, falling back:', err);
  }
  return { total: 0, databaseSize: 0, tenders: [] };
}


export async function runLiveScraper(params: {
  stateCodes: string[];
  maxTendersPerState: number;
}): Promise<{ success: boolean; totalCollected: number; databaseSize: number; tenders: TenderItem[]; error?: string }> {
  try {
    const res = await fetch('/api/scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) return { success: false, totalCollected: 0, databaseSize: 0, tenders: [], error: data?.error || 'Live scraper request failed' };
    return data;
  } catch (error: any) {
    return { success: false, totalCollected: 0, databaseSize: 0, tenders: [], error: error?.message || 'Unable to reach scraper backend' };
  }
}

export interface ManualScraperStatus {
  active: boolean;
  waitingForCaptcha: boolean;
  state: string | null;
  stateIndex: number;
  totalStates: number;
  collected: number;
}

export async function startManualCaptchaScraper(params: { stateCodes: string[]; maxTendersPerState: number }) {
  const res = await fetch('/api/scraper/manual/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Could not start browser session');
  return data;
}

export async function continueManualCaptchaScraper() {
  const res = await fetch('/api/scraper/manual/continue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Could not continue scraper');
  return data;
}

export async function stopManualCaptchaScraper() {
  try {
    const res = await fetch('/api/scraper/manual/stop', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveLiveTender(tender: TenderItem): Promise<TenderItem | null> {
  try {
    const res = await fetch('/api/tenders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tender)
    });
    if (res.ok) {
      const data = await res.json();
      return data.tender;
    }
  } catch (e) {
    console.error('Error saving tender:', e);
  }
  return null;
}

export async function toggleTenderBookmark(id: string): Promise<{ success: boolean; isBookmarked: boolean } | null> {
  try {
    const res = await fetch(`/api/tenders/${id}/bookmark`, { method: 'POST' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error toggling bookmark:', e);
  }
  return null;
}

export async function deleteLiveTender(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tenders/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

// Scraper Logs
export async function fetchScraperLogs(): Promise<ScraperLogMessage[]> {
  try {
    const res = await fetch('/api/scraper/logs');
    if (res.ok) {
      const data = await res.json();
      return data.logs || [];
    }
  } catch {
    // fallback
  }
  return [];
}

export async function postScraperLog(log: Partial<ScraperLogMessage>): Promise<ScraperLogMessage | null> {
  try {
    const res = await fetch('/api/scraper/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log)
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return null;
}

export async function clearScraperLogs(): Promise<boolean> {
  try {
    const res = await fetch('/api/scraper/logs', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

// AI Capabilities
export async function analyzeTenderWithAi(tender: TenderItem): Promise<TenderAiAnalysis | null> {
  try {
    const res = await fetch('/api/ai/analyze-tender', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tender)
    });
    if (res.ok) {
      const data = await res.json();
      return data.analysis;
    }
  } catch (e) {
    console.error('AI Analysis failed:', e);
  }
  return null;
}

export async function askTenderAiQuestion(tender: TenderItem, question: string): Promise<string> {
  try {
    const res = await fetch('/api/ai/tender-qa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tender, question })
    });
    if (res.ok) {
      const data = await res.json();
      return data.answer;
    }
  } catch (e) {
    console.error('AI QA failed:', e);
  }
  return 'Could not retrieve answer from AI service. Please verify server connection.';
}

export async function testGovernmentPortalLive(portalUrl: string): Promise<PortalCheckResult> {
  try {
    const res = await fetch('/api/portals/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalUrl })
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      url: portalUrl,
      status: 0,
      statusText: err.message || 'Network Failure',
      latencyMs: 0,
      reachable: false
    };
  }
}

export async function fetchLiveAlertRules(): Promise<AlertRule[]> {
  try {
    const res = await fetch('/api/alerts');
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return [];
}

export async function createLiveAlertRule(rule: Partial<AlertRule>): Promise<AlertRule | null> {
  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return null;
}

export async function deleteLiveAlertRule(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/alerts/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchLiveNotifications(): Promise<TenderAlertNotification[]> {
  try {
    const res = await fetch('/api/notifications');
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return [];
}

export async function clearLiveNotifications(): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/clear', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}
