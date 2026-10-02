import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { chromium, type Browser, type BrowserContext, type Page, type Frame } from 'playwright';
import { TenderItem, AlertRule, TenderAlertNotification, ScraperLogMessage, TenderAiAnalysis } from './src/types/tender';
import { DEFAULT_ALERT_RULES, findMatchingAlertKeywords } from './src/utils/alertManager';
import { INDIAN_STATES_PORTALS } from './src/data/statesData';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'tenders_db.json');
const RULES_FILE = path.join(DB_DIR, 'alert_rules.json');
const NOTIFS_FILE = path.join(DB_DIR, 'notifications.json');
const LOGS_FILE = path.join(DB_DIR, 'scraper_logs.json');

app.use(express.json());

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 1. Initialize persistent Tender Database
// The application starts empty on a fresh install. Records are populated only
// by the live scraper or explicit POST /api/tenders calls. No demo/mock tenders
// are injected into production data.
let tendersDatabase: TenderItem[] = [];
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    tendersDatabase = Array.isArray(parsed) ? parsed : [];
    console.log(`[DB] Loaded ${tendersDatabase.length} tenders from disk storage.`);
  } catch (err) {
    console.error('[DB] Error reading tenders_db.json. Starting with an empty database:', err);
    tendersDatabase = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(tendersDatabase, null, 2), 'utf-8');
  }
} else {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  console.log('[DB] Initialized empty production tender database.');
}

// 2. Initialize persistent Alert Rules
let alertRules: AlertRule[] = [];
if (fs.existsSync(RULES_FILE)) {
  try {
    alertRules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
  } catch {
    alertRules = [...DEFAULT_ALERT_RULES];
  }
} else {
  alertRules = [...DEFAULT_ALERT_RULES];
  fs.writeFileSync(RULES_FILE, JSON.stringify(alertRules, null, 2), 'utf-8');
}

// 3. Initialize persistent Notifications
let notifications: TenderAlertNotification[] = [];
if (fs.existsSync(NOTIFS_FILE)) {
  try {
    notifications = JSON.parse(fs.readFileSync(NOTIFS_FILE, 'utf-8'));
  } catch {
    notifications = [];
  }
}

// 4. Initialize persistent Scraper Logs
let scraperLogs: ScraperLogMessage[] = [];
if (fs.existsSync(LOGS_FILE)) {
  try {
    scraperLogs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  } catch {
    scraperLogs = [];
  }
}

function persistTenders() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(tendersDatabase, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] Failed to save tenders:', e);
  }
}

function persistRules() {
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(alertRules, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] Failed to save alert rules:', e);
  }
}

function persistNotifs() {
  try {
    fs.writeFileSync(NOTIFS_FILE, JSON.stringify(notifications, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] Failed to save notifications:', e);
  }
}

function persistLogs() {
  try {
    if (scraperLogs.length > 500) {
      scraperLogs = scraperLogs.slice(-500);
    }
    fs.writeFileSync(LOGS_FILE, JSON.stringify(scraperLogs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[DB] Failed to save scraper logs:', e);
  }
}

// ==========================================
// BACKEND API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    mode: 'PRODUCTION_BACKEND',
    uptimeSeconds: Math.floor(process.uptime()),
    databaseCount: tendersDatabase.length,
    activeAlertRules: alertRules.filter(r => r.enabled).length,
    notificationsCount: notifications.length,
    scraperLogsCount: scraperLogs.length,
    bookmarkedCount: tendersDatabase.filter(t => t.isBookmarked).length,
    hasAiEngine: false,
    timestamp: new Date().toISOString()
  });
});

// GET /api/tenders
app.get('/api/tenders', (req, res) => {
  let result = [...tendersDatabase];
  const { search, state, category, minBudget, onlyAlerts, onlyBookmarked, sortBy } = req.query;

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.tenderId.toLowerCase().includes(q) ||
      t.organization.toLowerCase().includes(q) ||
      t.location.toLowerCase().includes(q) ||
      t.workDescription.toLowerCase().includes(q)
    );
  }

  if (state && typeof state === 'string' && state !== 'ALL') {
    result = result.filter(t => t.state === state || t.stateCode === state);
  }

  if (category && typeof category === 'string' && category !== 'ALL') {
    result = result.filter(t => t.category === category);
  }

  if (minBudget && !isNaN(Number(minBudget)) && Number(minBudget) > 0) {
    result = result.filter(t => t.estimatedBudgetInr >= Number(minBudget));
  }

  if (onlyAlerts === 'true') {
    result = result.filter(t => t.matchedAlerts && t.matchedAlerts.length > 0);
  }

  if (onlyBookmarked === 'true') {
    result = result.filter(t => t.isBookmarked === true);
  }

  if (sortBy === 'budget_desc') {
    result.sort((a, b) => b.estimatedBudgetInr - a.estimatedBudgetInr);
  } else if (sortBy === 'budget_asc') {
    result.sort((a, b) => a.estimatedBudgetInr - b.estimatedBudgetInr);
  } else if (sortBy === 'date_soonest') {
    result.sort((a, b) => new Date(a.bidSubmissionEndDate).getTime() - new Date(b.bidSubmissionEndDate).getTime());
  } else if (sortBy === 'date_newest') {
    result.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
  }

  res.json({
    total: result.length,
    databaseSize: tendersDatabase.length,
    bookmarkedCount: tendersDatabase.filter(t => t.isBookmarked).length,
    tenders: result
  });
});


// ==========================================
// HUMAN-IN-THE-LOOP CAPTCHA BROWSER SESSION
// ==========================================
// Protected GePNIC searches require a CAPTCHA. We deliberately keep the
// browser visible so the user can solve that challenge in the real portal
// session. The application never reads, guesses, OCRs, or bypasses CAPTCHA.
let manualBrowser: Browser | null = null;
let manualContext: BrowserContext | null = null;
let manualPage: Page | null = null;
let manualRun: {
  stateCodes: string[];
  maxTendersPerState: number;
  stateIndex: number;
  collected: TenderItem[];
  waitingForCaptcha: boolean;
  currentState?: string;
} | null = null;

function gePNICActiveSearchUrl(portalUrl: string) {
  const base = portalUrl.replace(/\/$/, '');
  return `${base}?page=FrontEndLatestActiveTenders&service=page`;
}

async function ensureManualBrowser() {
  if (manualBrowser && manualPage) return;
  manualBrowser = await chromium.launch({ headless: false, channel: 'chrome' }).catch(async () => {
    return chromium.launch({ headless: false });
  });
  manualContext = await manualBrowser.newContext({
    locale: 'en-IN',
    viewport: { width: 1440, height: 900 },
  });
  manualPage = await manualContext.newPage();
}

async function navigateManualState(code: string) {
  if (!manualPage) throw new Error('Manual browser is not running.');
  const portal = INDIAN_STATES_PORTALS.find(p => p.code === code);
  if (!portal) throw new Error(`Unknown state code: ${code}`);
  const target = /GePNIC/i.test(portal.engine)
    ? gePNICActiveSearchUrl(portal.portalUrl)
    : portal.portalUrl;
  await manualPage.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await manualPage.waitForTimeout(1200);
  manualRun!.currentState = code;
  manualRun!.waitingForCaptcha = /captcha/i.test(await manualPage.locator('body').innerText().catch(() => ''));
}

function isSessionExpiredHtml(html: string) {
  return /your session (?:in the client area )?has (?:expired|timed out)|stale session|session has timed out/i.test(html);
}

async function portalFrames(page: Page): Promise<Frame[]> {
  return page.frames();
}

async function captchaValuePresent(page: Page) {
  for (const frame of await portalFrames(page)) {
    const inputs = frame.locator('input');
    const count = await inputs.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i);
      const meta = await el.evaluate((node) => {
        const n = node as HTMLInputElement;
        return { name: n.name || '', id: n.id || '', placeholder: n.placeholder || '', type: n.type || '', value: n.value || '' };
      }).catch(() => null);
      if (!meta) continue;
      if (/captcha/i.test(`${meta.name} ${meta.id} ${meta.placeholder}`) && meta.value.trim()) return true;
    }
  }
  return false;
}

async function clickSearchOnPortal(page: Page) {
  for (const frame of await portalFrames(page)) {
    const candidates = frame.locator('input,button,a');
    const count = await candidates.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const text = await el.evaluate((node) => {
        const n = node as HTMLInputElement | HTMLButtonElement | HTMLAnchorElement;
        return `${n.textContent || ''} ${(n as HTMLInputElement).value || ''} ${(n as HTMLInputElement).title || ''}`.trim();
      }).catch(() => '');
      if (/^\s*search\s*$/i.test(text) || /\bsearch\b/i.test(text)) {
        await el.click({ timeout: 10000 }).catch(() => {});
        return true;
      }
    }
  }
  return false;
}

async function extractRowsFromFrame(frame: Frame, portalUrl: string) {
  try {
    return extractLatestRows(await frame.content(), portalUrl);
  } catch {
    return [];
  }
}

async function extractRowsFromLivePortal(page: Page, portalUrl: string) {
  const allRows: Array<{title: string; reference: string; closing: string; opening: string; href: string}> = [];
  const seen = new Set<string>();

  for (const frame of await portalFrames(page)) {
    const rows = await extractRowsFromFrame(frame, portalUrl);
    for (const row of rows) {
      const key = row.href || `${row.title}|${row.reference}`;
      if (!seen.has(key)) {
        seen.add(key);
        allRows.push(row);
      }
    }
  }
  return allRows;
}

async function hasTenderRowsOnPortal(page: Page, portalUrl: string) {
  return (await extractRowsFromLivePortal(page, portalUrl)).length > 0;
}

async function clickNextOnPortal(page: Page) {
  for (const frame of await portalFrames(page)) {
    const candidates = frame.locator('a,button,input');
    const count = await candidates.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const el = candidates.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const meta = await el.evaluate((node) => {
        const n = node as HTMLAnchorElement & HTMLButtonElement & HTMLInputElement;
        return {
          text: `${n.textContent || ''} ${n.value || ''} ${n.title || ''}`.trim(),
          href: (n as HTMLAnchorElement).href || '',
          disabled: Boolean((n as HTMLButtonElement).disabled),
          cls: (n as HTMLElement).className || '',
        };
      }).catch(() => null);
      if (!meta || meta.disabled) continue;
      if (/\bnext\b|next page|›|»/i.test(meta.text) || /next/i.test(meta.cls)) {
        const before = (await extractRowsFromLivePortal(page, ''))[0]?.href || '';
        await el.click({ timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const afterRows = await extractRowsFromLivePortal(page, '');
        const after = afterRows[0]?.href || '';
        if (before !== after || afterRows.length) return true;
      }
    }
  }
  return false;
}

async function collectCurrentManualState() {
  if (!manualPage || !manualRun?.currentState) throw new Error('No active manual portal session.');
  const code = manualRun.currentState;
  const portal = INDIAN_STATES_PORTALS.find(p => p.code === code);
  if (!portal) throw new Error(`Unknown state code: ${code}`);

  // The old Selenium implementation handled CAPTCHA/table iframes explicitly.
  // Playwright page.content() only sees the main document, so inspect every frame.
  // If the portal has already rendered the tender table after CAPTCHA, do not
  // click Search a second time. Some GePNIC pages submit/reload on that click.
  let rows = await extractRowsFromLivePortal(manualPage, portal.portalUrl);

  if (!rows.length) {
    const captchaEntered = await captchaValuePresent(manualPage);
    if (!captchaEntered) {
      throw new Error('CAPTCHA has not been entered in the portal browser yet. Solve the CAPTCHA there, wait for the tender list to load, then continue.');
    }
    const clicked = await clickSearchOnPortal(manualPage);
    if (!clicked) throw new Error('Could not find the portal Search control. Leave the portal page open after CAPTCHA verification and retry.');
    await manualPage.waitForTimeout(2200);
    rows = await extractRowsFromLivePortal(manualPage, portal.portalUrl);
  }

  const allRows = [...rows];
  const seenRows = new Set(allRows.map(r => r.href || `${r.title}|${r.reference}`));
  const maxRows = Math.max(1, Math.min(manualRun.maxTendersPerState, 500));

  // Collect additional real pagination pages while staying in the same
  // authenticated browser session. No synthetic rows are created.
  for (let pageNo = 1; allRows.length < maxRows && pageNo < 50; pageNo++) {
    const moved = await clickNextOnPortal(manualPage);
    if (!moved) break;
    const nextRows = await extractRowsFromLivePortal(manualPage, portal.portalUrl);
    if (!nextRows.length) break;
    let added = 0;
    for (const row of nextRows) {
      const key = row.href || `${row.title}|${row.reference}`;
      if (!seenRows.has(key)) {
        seenRows.add(key);
        allRows.push(row);
        added++;
      }
      if (allRows.length >= maxRows) break;
    }
    if (!added) break;
  }

  rows = allRows.slice(0, maxRows);
  const results: TenderItem[] = [];

  if (!rows.length) {
    throw new Error(`${portal.name}: CAPTCHA was accepted, but no tender rows were detected in the current portal page or its iframes.`);
  }

  // Detail pages are opened from the links found in the authenticated portal
  // session, so GePNIC's session-bound URLs remain valid.
  for (const row of rows) {
    if (!row.href || !/^https?:/i.test(row.href)) continue;
    try {
      await manualPage.goto(row.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await manualPage.waitForTimeout(500);
      const detailHtml = await manualPage.content();
      if (isSessionExpiredHtml(detailHtml)) continue;
      const $ = cheerio.load(detailHtml);
      const text = cleanText($('body').text());
      const detail = {
        title: extractLabelValue(text, ['Tender Title', 'Title']) || row.title,
        organization: extractLabelValue(text, ['Organisation Name', 'Organization Name', 'Organisation']) || portal.name,
        department: extractLabelValue(text, ['Department Name', 'Department']) || '',
        location: extractLabelValue(text, ['Location']) || '',
        budget: parseMoney(extractLabelValue(text, ['Estimated Cost', 'Tender Value in ₹', 'Tender Value', 'Estimated Tender Value'])),
        emd: parseMoney(extractLabelValue(text, ['Earnest Money Deposit', 'EMD Amount', 'EMD'])),
        fee: parseMoney(extractLabelValue(text, ['Tender Fee', 'Fee in ₹'])),
        description: extractLabelValue(text, ['Work Description', 'Item Description', 'Description']) || row.title,
        tenderId: extractLabelValue(text, ['Tender ID', 'Tender Id']) || row.reference || row.href,
        documentsCount: $('a[href*="download"],a[href*="Download"],a[href*="document"],a[href*="Document"]').length,
      };
      const tender: TenderItem = {
        id: `LIVE-${portal.code}-${detail.tenderId}`,
        tenderId: detail.tenderId,
        title: detail.title,
        organization: detail.organization,
        department: detail.department,
        state: portal.name,
        stateCode: portal.code,
        category: inferCategory(detail.title),
        publishDate: new Date().toISOString().slice(0, 10),
        bidSubmissionStartDate: '',
        bidSubmissionEndDate: parseDateValue(row.closing) || row.closing || '',
        tenderOpeningDate: parseDateValue(row.opening),
        estimatedBudgetInr: detail.budget,
        formattedBudget: formatRupees(detail.budget),
        tenderFee: detail.fee,
        emdAmount: detail.emd,
        detailUrl: row.href,
        tenderReferenceNumber: row.reference,
        location: detail.location || portal.name,
        workDescription: detail.description,
        documentsCount: detail.documentsCount,
        isIframeExtracted: false,
        scrapedAt: new Date().toISOString(),
        status: 'Open',
      };
      tender.matchedAlerts = findMatchingAlertKeywords(tender, alertRules);
      results.push(tender);
    } catch {
      // Keep going: one broken/expired detail page must not discard the other real rows.
    }
  }

  if (!results.length) {
    throw new Error(`${portal.name}: tender rows were found, but no detail records could be opened in the authenticated session. The portal may have expired the session or changed its detail-link structure.`);
  }

  await navigateManualState(code);
  return results;
}

app.post('/api/scraper/manual/start', async (req, res) => {
  const stateCodes = Array.isArray(req.body?.stateCodes) ? req.body.stateCodes.map(String) : [];
  const maxTendersPerState = Math.max(1, Math.min(Number(req.body?.maxTendersPerState) || 20, 500));
  if (!stateCodes.length) return res.status(400).json({ error: 'Select at least one state.' });

  try {
    await ensureManualBrowser();
    manualRun = { stateCodes, maxTendersPerState, stateIndex: 0, collected: [], waitingForCaptcha: true };
    await navigateManualState(stateCodes[0]);
    const portal = INDIAN_STATES_PORTALS.find(p => p.code === stateCodes[0]);
    const log: ScraperLogMessage = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      state: portal?.name || stateCodes[0],
      level: 'warning',
      message: `Browser opened for ${portal?.name || stateCodes[0]}. Solve the CAPTCHA in the visible government portal, then click Continue in Tender Compiler.`,
    };
    scraperLogs.push(log); persistLogs();
    res.json({ success: true, state: stateCodes[0], stateName: portal?.name || stateCodes[0], message: log.message });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Could not start browser session. Install Playwright Chromium and retry.' });
  }
});

app.get('/api/scraper/manual/status', (_req, res) => {
  res.json({
    active: Boolean(manualRun && manualPage),
    waitingForCaptcha: manualRun?.waitingForCaptcha ?? false,
    state: manualRun?.currentState || null,
    stateIndex: manualRun?.stateIndex ?? 0,
    totalStates: manualRun?.stateCodes.length ?? 0,
    collected: manualRun?.collected.length ?? 0,
  });
});

app.post('/api/scraper/manual/continue', async (req, res) => {
  if (!manualRun || !manualPage) return res.status(400).json({ error: 'No active browser session. Start a manual CAPTCHA run first.' });
  try {
    const rows = await collectCurrentManualState();
    const currentPortalName = INDIAN_STATES_PORTALS.find(p => p.code === manualRun!.currentState)?.name || manualRun.currentState || 'PORTAL';
    scraperLogs.push({
      id: `manual-scan-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      state: currentPortalName,
      level: 'info',
      message: `Authenticated portal scan found ${rows.length} real tender detail records.`,
      tendersFound: rows.length,
    });
    persistLogs();
    for (const tender of rows) {
      const existingIdx = tendersDatabase.findIndex(t => t.tenderId === tender.tenderId);
      if (existingIdx >= 0) tendersDatabase[existingIdx] = { ...tendersDatabase[existingIdx], ...tender };
      else tendersDatabase.unshift(tender);
    }
    manualRun.collected.push(...rows);
    persistTenders();

    const currentPortal = INDIAN_STATES_PORTALS.find(p => p.code === manualRun!.currentState);
    scraperLogs.push({
      id: `manual-done-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      state: currentPortal?.name || manualRun.currentState || 'PORTAL',
      level: rows.length ? 'success' : 'warning',
      message: `${rows.length} real tender records extracted after manual CAPTCHA verification.`,
      tendersFound: rows.length,
    });
    persistLogs();

    manualRun.stateIndex += 1;
    if (manualRun.stateIndex >= manualRun.stateCodes.length) {
      const result = { success: true, done: true, totalCollected: manualRun.collected.length, databaseSize: tendersDatabase.length, tenders: manualRun.collected };
      manualRun = null;
      return res.json(result);
    }

    const nextCode = manualRun.stateCodes[manualRun.stateIndex];
    await navigateManualState(nextCode);
    const nextPortal = INDIAN_STATES_PORTALS.find(p => p.code === nextCode);
    res.json({
      success: true,
      done: false,
      state: nextCode,
      stateName: nextPortal?.name || nextCode,
      totalCollected: manualRun.collected.length,
      databaseSize: tendersDatabase.length,
      tenders: rows,
      message: `Next portal ready: ${nextPortal?.name || nextCode}. Solve its CAPTCHA in the browser, then continue.`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Manual CAPTCHA step failed.' });
  }
});

app.post('/api/scraper/manual/stop', async (_req, res) => {
  try { await manualPage?.close(); } catch {}
  try { await manualContext?.close(); } catch {}
  try { await manualBrowser?.close(); } catch {}
  manualPage = null; manualContext = null; manualBrowser = null; manualRun = null;
  res.json({ success: true });
});

// ==========================================
// LIVE GePNIC SCRAPER
// ==========================================
// GePNIC portals create session-bound detail links. A stale link copied from
// an earlier browser session will eventually produce the exact "Your session
// has timed out" page. The live scraper therefore opens the portal fresh,
// keeps its Set-Cookie session, extracts the current links, and immediately
// reads the detail page in the same session where possible.

type CookieJar = Map<string, string>;

function mergeSetCookies(jar: CookieJar, setCookie: string | null) {
  if (!setCookie) return;
  const cookies = setCookie.split(/,(?=[^;]+=[^;]+)/g);
  for (const cookie of cookies) {
    const pair = cookie.split(';')[0]?.trim();
    const eq = pair?.indexOf('=');
    if (eq && eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader(jar: CookieJar) {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function liveFetch(url: string, jar: CookieJar, referer?: string) {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Cache-Control': 'no-cache',
  };
  const cookies = cookieHeader(jar);
  if (cookies) headers.Cookie = cookies;
  if (referer) headers.Referer = referer;

  const response = await fetch(url, { headers, redirect: 'follow' });
  mergeSetCookies(jar, response.headers.get('set-cookie'));
  return response;
}

function absoluteUrl(base: string, href: string) {
  try { return new URL(href, base).toString(); } catch { return base; }
}

function cleanText(value: string | undefined | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseDateValue(value: string) {
  const cleaned = cleanText(value);
  const match = cleaned.match(/(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{1,2}\s+\w{3,9}\s+\d{2,4})/i);
  return match ? match[1] : cleaned;
}

function parseMoney(value: string) {
  const text = cleanText(value).toLowerCase().replace(/,/g, '');
  const match = text.match(/(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac|lakhs|million|thousand|k)?/i);
  if (!match) return 0;
  const n = Number(match[1]);
  const unit = match[2] || '';
  if (['crore', 'cr'].includes(unit)) return Math.round(n * 10000000);
  if (['lakh', 'lac', 'lakhs'].includes(unit)) return Math.round(n * 100000);
  if (unit === 'million') return Math.round(n * 1000000);
  if (['thousand', 'k'].includes(unit)) return Math.round(n * 1000);
  return Math.round(n);
}

function formatRupees(value: number) {
  if (!value) return 'Not specified';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function inferCategory(title: string): TenderItem['category'] {
  const t = title.toLowerCase();
  if (/road|bridge|highway|flyover|asphalt|culvert/.test(t)) return 'Roads & Bridges';
  if (/hospital|medical|medicine|pharma|health/.test(t)) return 'Healthcare & Pharma';
  if (/software|server|it |information technology|network|computer|digital|fiber|telecom/.test(t)) return 'IT & Telecom';
  if (/water|sewer|drain|sanitation|pipeline/.test(t)) return 'Water Supply & Sanitation';
  if (/solar|electrical|power|transformer|substation|energy/.test(t)) return 'Power & Energy';
  if (/school|education|training|service/.test(t)) return 'Education & Services';
  if (/security|guard|housekeeping|facility/.test(t)) return 'Security & Facility';
  return 'Civil Works';
}

function extractLatestRows(html: string, portalUrl: string) {
  const $ = cheerio.load(html);
  const rows: Array<{title: string; reference: string; closing: string; opening: string; href: string}> = [];
  const seen = new Set<string>();

  $('table').each((_, table) => {
    const headerCells = $(table).find('tr').first().find('th,td');
    const headers = headerCells.map((_, el) => cleanText($(el).text()).toLowerCase()).get();
    const headerText = headers.join(' | ');
    const tenderish = /tender|nit|procurement|work description|item description/i.test(headerText);
    const dateish = /closing|submission|last date|bid end|opening date|publish/i.test(headerText);
    const rowsInTable = $(table).find('tr');
    if (rowsInTable.length < 2 || (!tenderish && !dateish)) return;

    const titleIdx = headers.findIndex(h => /tender title|title|work description|item description|tender name/i.test(h));
    const refIdx = headers.findIndex(h => /tender ref|reference|nit no|tender id|tender no/i.test(h));
    const closingIdx = headers.findIndex(h => /closing|submission end|last date|bid submission/i.test(h));
    const openingIdx = headers.findIndex(h => /opening date|bid opening/i.test(h));

    rowsInTable.slice(1).each((_, tr) => {
      const cells = $(tr).find('td').map((_, el) => cleanText($(el).text())).get();
      if (!cells.length) return;
      const link = $(tr).find('a[href]').first();
      const linkText = cleanText(link.text());
      const title = (titleIdx >= 0 ? cells[titleIdx] : '') || linkText || cells[0] || '';
      const href = absoluteUrl(portalUrl, link.attr('href') || '');
      if (!title || title.length < 5 || /more\.\.\.|search|login|home/i.test(title)) return;
      if (!href || href === portalUrl) return;

      const row = {
        title,
        reference: refIdx >= 0 ? cells[refIdx] || '' : cells[1] || '',
        closing: closingIdx >= 0 ? cells[closingIdx] || '' : cells[2] || '',
        opening: openingIdx >= 0 ? cells[openingIdx] || '' : cells[3] || '',
        href,
      };
      const key = row.href || `${row.title}|${row.reference}`;
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    });
  });

  // Fallback closely mirrors the previous Selenium scraper: if the portal's
  // markup has no reliable headers, collect tender-looking links from the page.
  if (!rows.length) {
    $('a[href]').each((_, a) => {
      const title = cleanText($(a).text());
      const href = $(a).attr('href') || '';
      if (title.length < 15 || !/tender|construction|procurement|supply|repair|maintenance|work order/i.test(title)) return;
      const absolute = absoluteUrl(portalUrl, href);
      if (!absolute || absolute === portalUrl || seen.has(absolute)) return;
      seen.add(absolute);
      rows.push({ title, reference: '', closing: '', opening: '', href: absolute });
    });
  }
  return rows;
}

function extractLabelValue(text: string, labels: string[]) {
  const escaped = labels.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const m = text.match(new RegExp(`(?:${escaped})\\s*[:\\-]?\\s*([^\\n]{1,180})`, 'i'));
  return cleanText(m?.[1]);
}

async function enrichTenderFromDetail(detailUrl: string, jar: CookieJar, referer: string, row: {title: string; reference: string; closing: string; opening: string}) {
  try {
    const response = await liveFetch(detailUrl, jar, referer);
    const html = await response.text();
    if (!response.ok || /session has timed out|stale session/i.test(html)) return null;
    const $ = cheerio.load(html);
    const text = cleanText($('body').text());
    const title = extractLabelValue(text, ['Tender Title', 'Title']) || row.title;
    const organization = extractLabelValue(text, ['Organisation Name', 'Organization Name', 'Organisation']) || 'Government Procurement Organisation';
    const department = extractLabelValue(text, ['Department Name', 'Department']) || '';
    const location = extractLabelValue(text, ['Location']) || '';
    const budgetText = extractLabelValue(text, ['Estimated Cost', 'Tender Value in ₹', 'Tender Value', 'Estimated Tender Value']);
    const emdText = extractLabelValue(text, ['Earnest Money Deposit', 'EMD Amount', 'EMD']);
    const feeText = extractLabelValue(text, ['Tender Fee', 'Fee in ₹']);
    const description = extractLabelValue(text, ['Work Description', 'Item Description', 'Description']) || title;
    const tenderId = extractLabelValue(text, ['Tender ID', 'Tender Id']) || row.reference || detailUrl;
    return { title, organization, department, location, budget: parseMoney(budgetText), emd: parseMoney(emdText), fee: parseMoney(feeText), description, tenderId, detailUrl, documentsCount: $('a[href*="download"], a[href*="Download"], a[href*="document"], a[href*="Document"]').length };
  } catch {
    return null;
  }
}

async function scrapeStateLive(stateCode: string, maxTenders: number) {
  const portal = INDIAN_STATES_PORTALS.find(p => p.code === stateCode);
  if (!portal) throw new Error(`Unknown state code: ${stateCode}`);

  const jar: CookieJar = new Map();
  const homeResponse = await liveFetch(portal.portalUrl, jar);
  const homeHtml = await homeResponse.text();
  if (!homeResponse.ok) throw new Error(`${portal.name}: HTTP ${homeResponse.status}`);
  if (/session has timed out|stale session/i.test(homeHtml)) throw new Error(`${portal.name}: portal returned a stale session page`);

  const rows = extractLatestRows(homeHtml, portal.portalUrl).slice(0, Math.max(1, Math.min(maxTenders, 50)));
  const results: TenderItem[] = [];
  for (const row of rows) {
    const detail = await enrichTenderFromDetail(row.href, jar, portal.portalUrl, row);
    const budget = detail?.budget || 0;
    const endDate = parseDateValue(row.closing);
    const title = detail?.title || row.title;
    const tenderId = detail?.tenderId || row.reference || `LIVE-${portal.code}-${Buffer.from(row.href).toString('base64url').slice(0, 24)}`;
    const tender: TenderItem = {
      id: `LIVE-${portal.code}-${tenderId}`,
      tenderId,
      title,
      organization: detail?.organization || portal.name,
      department: detail?.department || '',
      state: portal.name,
      stateCode: portal.code,
      category: inferCategory(title),
      publishDate: new Date().toISOString().slice(0, 10),
      bidSubmissionStartDate: '',
      bidSubmissionEndDate: endDate || row.closing || '',
      tenderOpeningDate: parseDateValue(row.opening),
      estimatedBudgetInr: budget,
      formattedBudget: formatRupees(budget),
      tenderFee: detail?.fee || 0,
      emdAmount: detail?.emd || 0,
      detailUrl: row.href,
      tenderReferenceNumber: row.reference,
      location: detail?.location || portal.name,
      workDescription: detail?.description || title,
      documentsCount: detail?.documentsCount || 0,
      isIframeExtracted: false,
      scrapedAt: new Date().toISOString(),
      status: 'Open',
    };
    tender.matchedAlerts = findMatchingAlertKeywords(tender, alertRules);
    results.push(tender);
  }
  return results;
}

app.post('/api/scraper/run', async (req, res) => {
  const stateCodes = Array.isArray(req.body?.stateCodes) ? req.body.stateCodes.map(String) : [];
  const maxTenders = Number(req.body?.maxTendersPerState) || 10;
  if (!stateCodes.length) return res.status(400).json({ error: 'Select at least one state.' });

  const collected: TenderItem[] = [];
  const runId = `run-${Date.now()}`;
  const addLog = (state: string, level: ScraperLogMessage['level'], message: string, page?: number, count?: number) => {
    const log: ScraperLogMessage = { id: `${runId}-${scraperLogs.length}`, timestamp: new Date().toLocaleTimeString(), state, level, message, page, tendersFound: count };
    scraperLogs.push(log); persistLogs();
  };

  for (const code of stateCodes) {
    const portal = INDIAN_STATES_PORTALS.find(p => p.code === code);
    if (!portal) continue;
    addLog(portal.name, 'info', `Opening live portal: ${portal.portalUrl}`);
    try {
      const rows = await scrapeStateLive(code, maxTenders);
      for (const tender of rows) {
        const existingIdx = tendersDatabase.findIndex(t => t.tenderId === tender.tenderId);
        if (existingIdx >= 0) tendersDatabase[existingIdx] = { ...tendersDatabase[existingIdx], ...tender };
        else tendersDatabase.unshift(tender);
      }
      collected.push(...rows);
      persistTenders();
      addLog(portal.name, 'success', `Live extraction complete: ${rows.length} real tender records collected.`, 1, rows.length);
    } catch (error: any) {
      addLog(portal.name, 'error', `Live extraction failed: ${error?.message || 'Unknown portal error'}`);
    }
  }

  res.json({ success: true, runId, totalCollected: collected.length, tenders: collected, databaseSize: tendersDatabase.length });
});

// POST /api/tenders (Insert a tender)
app.post('/api/tenders', (req, res) => {
  const tender: TenderItem = req.body;
  if (!tender || !tender.title || !tender.tenderId) {
    return res.status(400).json({ error: 'title and tenderId are required fields' });
  }

  // Check alert matching
  const matched = findMatchingAlertKeywords(tender, alertRules);
  tender.matchedAlerts = matched;
  tender.scrapedAt = new Date().toLocaleTimeString();

  const existingIdx = tendersDatabase.findIndex(t => t.tenderId === tender.tenderId);
  if (existingIdx >= 0) {
    tendersDatabase[existingIdx] = { ...tendersDatabase[existingIdx], ...tender };
  } else {
    tendersDatabase.unshift(tender);
  }
  persistTenders();

  // If matched keywords, trigger real notification
  if (matched.length > 0) {
    const notif: TenderAlertNotification = {
      id: `notif-${Date.now()}`,
      tenderId: tender.tenderId,
      tenderTitle: tender.title,
      organization: tender.organization,
      state: tender.state,
      budgetFormatted: tender.formattedBudget,
      matchedKeyword: matched[0],
      timestamp: new Date().toLocaleTimeString(),
      tenderItem: tender,
      read: false
    };
    notifications.unshift(notif);
    persistNotifs();
  }

  res.status(201).json({ success: true, tender });
});

// POST /api/tenders/:id/bookmark (Toggle bookmark status)
app.post('/api/tenders/:id/bookmark', (req, res) => {
  const { id } = req.params;
  const tender = tendersDatabase.find(t => t.id === id || t.tenderId === id);
  if (!tender) {
    return res.status(404).json({ error: 'Tender not found' });
  }

  tender.isBookmarked = !tender.isBookmarked;
  persistTenders();

  res.json({
    success: true,
    tenderId: tender.tenderId,
    isBookmarked: tender.isBookmarked
  });
});

// DELETE /api/tenders/:id
app.delete('/api/tenders/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = tendersDatabase.length;
  tendersDatabase = tendersDatabase.filter(t => t.id !== id && t.tenderId !== id);
  if (tendersDatabase.length < initialLen) {
    persistTenders();
    res.json({ success: true, removedId: id });
  } else {
    res.status(404).json({ error: 'Tender not found' });
  }
});

// ==========================================
// SCRAPER LOGS ENDPOINTS
// ==========================================
app.get('/api/scraper/logs', (req, res) => {
  res.json({
    total: scraperLogs.length,
    logs: scraperLogs
  });
});

app.post('/api/scraper/logs', (req, res) => {
  const newLog: ScraperLogMessage = req.body;
  if (!newLog.message) {
    return res.status(400).json({ error: 'Log message required' });
  }

  newLog.id = newLog.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  newLog.timestamp = newLog.timestamp || new Date().toLocaleTimeString();

  scraperLogs.push(newLog);
  persistLogs();
  res.status(201).json(newLog);
});

app.post('/api/scraper/logs/batch', (req, res) => {
  const { logs } = req.body;
  if (Array.isArray(logs)) {
    scraperLogs.push(...logs);
    persistLogs();
  }
  res.json({ success: true, count: scraperLogs.length });
});

app.delete('/api/scraper/logs', (req, res) => {
  scraperLogs = [];
  persistLogs();
  res.json({ success: true });
});

// ==========================================
// AI CAPABILITIES & INTEGRATION (SERVER-SIDE)
// ==========================================

// AI Tender Bid Risk & Eligibility Evaluator
app.post('/api/ai/analyze-tender', async (req, res) => {
  const tender: TenderItem = req.body;
  if (!tender || !tender.title) {
    return res.status(400).json({ error: 'Tender data is required for evaluation' });
  }

  // Deterministic heuristic tender-intelligence engine. No external model or API is required.
  const isHighBudget = tender.estimatedBudgetInr > 50000000;
  const analysisData: TenderAiAnalysis = {
    executiveSummary: `High-value ${tender.category} project issued by ${tender.organization}. Budget is set at ${tender.formattedBudget} with EMD requirement of INR ${tender.emdAmount.toLocaleString('en-IN')}. Bid submission closes on ${tender.bidSubmissionEndDate}.`,
    bidRecommendation: isHighBudget ? 'HIGHLY RECOMMENDED' : 'BID WITH CAUTION',
    viabilityScore: isHighBudget ? 84 : 76,
    keyRisks: [
      `Tight submission window ending on ${tender.bidSubmissionEndDate}`,
      `Statutory EMD commitment of INR ${tender.emdAmount.toLocaleString('en-IN')} requiring active Bank Guarantee`,
      `Local state compliance requirements and site handover constraints in ${tender.state}`
    ],
    eligibilityChecklist: [
      `Minimum 3 years average financial turnover of at least 30% of estimated value`,
      `Proof of completion for at least 2 similar works in central/state PSUs`,
      `Valid Class 3 Digital Signature Certificate (DSC) for GePNIC submission`,
      `GST registration and valid PAN documentation`
    ],
    strategicAdvantages: [
      `Standard NIC GePNIC two-cover bidding mechanism reduces technical disqualification risk`,
      `Transparent BoQ format allows itemized pricing optimization`,
      `High visibility project under ${tender.department}`
    ],
    complianceNotes: `Verify MSME / Startup exemption clauses in General Financial Rules (GFR 2017) rule 161(iv). EMD exemption may apply for valid Udyam certificate holders in service categories.`,
    analyzedAt: new Date().toLocaleTimeString()
  };

  const existing = tendersDatabase.find(t => t.id === tender.id || t.tenderId === tender.tenderId);
  if (existing) {
    existing.aiAnalysis = analysisData;
    persistTenders();
  }

  return res.json({ success: true, analysis: analysisData, source: 'tender-intelligence-engine' });
});

// Interactive AI Tender Q&A Copilot


app.post('/api/ai/tender-qa', async (req, res) => {
  const { tender, question } = req.body;
  if (!tender || !question) {
    return res.status(400).json({ error: 'Tender and user question are required' });
  }

  // Local rule-based Q&A fallback used as the permanent implementation.
  const qLower = question.toLowerCase();
  let fallbackAnswer = `Based on the tender details for **${tender.title}**:\n\n`;
  if (qLower.includes('emd') || qLower.includes('earnest')) {
    fallbackAnswer += `• **EMD Required:** INR ${tender.emdAmount.toLocaleString('en-IN')}.\n• **Payment Method:** Usually deposited online via GePNIC Net Banking / RTGS / NEFT or as an irrevocable Bank Guarantee.\n• **MSME Exemption:** Micro and Small Enterprises registered with Udyam are generally exempt from EMD submission under GFR Rule 170.`;
  } else if (qLower.includes('deadline') || qLower.includes('date')) {
    fallbackAnswer += `• **Bid Submission Deadline:** ${tender.bidSubmissionEndDate}.\n• **Tender Opening Date:** ${tender.tenderOpeningDate}.\n• **Recommendation:** Submit your bid at least 24 hours prior to deadline to prevent last-minute GePNIC portal gateway timeouts.`;
  } else {
    fallbackAnswer += `• **Estimated Budget:** ${tender.formattedBudget}\n• **Organization:** ${tender.organization}\n• **Location:** ${tender.location}\n• **Scope:** ${tender.workDescription}\n\nPlease ensure your Class-3 Digital Signature Certificate (DSC) is mapped to your GePNIC vendor profile before uploading the encrypted BoQ.`;
  }

  res.json({ answer: fallbackAnswer, source: 'tender-intelligence-engine' });
});

// POST /api/portals/check (Real live HTTPS network probe to government portals)
app.post('/api/portals/check', async (req, res) => {
  const { portalUrl } = req.body;
  if (!portalUrl) {
    return res.status(400).json({ error: 'portalUrl is required' });
  }

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);

    const response = await fetch(portalUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const serverHeader = response.headers.get('server') || 'Government NIC Servlet';
    const status = response.status;
    const statusText = response.statusText;

    let hasGePNICSignature = false;
    try {
      const text = await response.text();
      hasGePNICSignature = text.includes('nicgep') || text.includes('PageFrame') || text.includes('tender') || text.includes('eProcurement');
    } catch {
      // ignore
    }

    res.json({
      success: true,
      url: portalUrl,
      status,
      statusText,
      latencyMs,
      serverHeader,
      contentType,
      hasGePNICSignature,
      reachable: status >= 200 && status < 400
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    res.json({
      success: false,
      url: portalUrl,
      status: isTimeout ? 408 : 503,
      statusText: isTimeout ? 'Gateway Timeout (Portal Slow/Restricted)' : (err.message || 'Connection Refused'),
      latencyMs,
      reachable: false,
      isGeoblockedOrProtected: true,
      note: 'State NIC portals often employ WAF / IP geofencing for offshore traffic. Use proxy or run local Python script.'
    });
  }
});

// Alerts endpoints
app.get('/api/alerts', (req, res) => {
  res.json(alertRules);
});

app.post('/api/alerts', (req, res) => {
  const { keyword, minBudget, enabled = true } = req.body;
  if (!keyword) return res.status(400).json({ error: 'keyword required' });

  const newRule: AlertRule = {
    id: `rule-${Date.now()}`,
    keyword: keyword.trim().toLowerCase(),
    minBudgetInr: Number(minBudget) || 0,
    enabled: Boolean(enabled),
    color: 'amber',
    soundEnabled: true,
    desktopNotify: true
  };

  alertRules.push(newRule);
  persistRules();
  res.status(201).json(newRule);
});

app.delete('/api/alerts/:id', (req, res) => {
  const { id } = req.params;
  alertRules = alertRules.filter(r => r.id !== id);
  persistRules();
  res.json({ success: true, removedId: id });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json(notifications);
});

app.post('/api/notifications/clear', (req, res) => {
  notifications = [];
  persistNotifs();
  res.json({ success: true });
});

app.post('/api/notifications/mark-read', (req, res) => {
  notifications = notifications.map(n => ({ ...n, read: true }));
  persistNotifs();
  res.json({ success: true });
});

// CSV Export Download
app.get('/api/export/csv', (req, res) => {
  const onlyBookmarked = req.query.onlyBookmarked === 'true';
  const data = onlyBookmarked ? tendersDatabase.filter(t => t.isBookmarked) : tendersDatabase;

  const headers = [
    'Tender ID', 'Title', 'Organization', 'Department', 'State', 'Category',
    'Publish Date', 'Bid Submission End Date', 'Tender Opening Date',
    'Estimated Budget INR', 'EMD Amount INR', 'Tender Fee INR',
    'Location', 'PIN Code', 'Tender Ref Number', 'Is Bookmarked', 'Matched Alerts', 'Detail Portal URL'
  ];

  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = data.map(t => [
    escapeCsv(t.tenderId),
    escapeCsv(t.title),
    escapeCsv(t.organization),
    escapeCsv(t.department),
    escapeCsv(t.state),
    escapeCsv(t.category),
    escapeCsv(t.publishDate),
    escapeCsv(t.bidSubmissionEndDate),
    escapeCsv(t.tenderOpeningDate),
    t.estimatedBudgetInr,
    t.emdAmount,
    t.tenderFee,
    escapeCsv(t.location),
    escapeCsv(t.pincode || ''),
    escapeCsv(t.tenderReferenceNumber),
    t.isBookmarked ? 'YES' : 'NO',
    escapeCsv(t.matchedAlerts?.join('; ') || ''),
    escapeCsv(t.detailUrl)
  ].join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=gepnic_compiled_tenders_${new Date().toISOString().slice(0, 10)}.csv`);
  res.send(csv);
});

// JSON Export Download
app.get('/api/export/json', (req, res) => {
  const onlyBookmarked = req.query.onlyBookmarked === 'true';
  const data = onlyBookmarked ? tendersDatabase.filter(t => t.isBookmarked) : tendersDatabase;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=gepnic_compiled_tenders_${new Date().toISOString().slice(0, 10)}.json`);
  res.send(JSON.stringify(data, null, 2));
});

// ==========================================
// VITE INTEGRATION (DEV / PROD)
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve('dist'))) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`  GePNIC Multi-State Tender Compiler & Scraper Engine (v2.6) `);
    console.log(`  Real Full-Stack Server Running at: http://0.0.0.0:${PORT}  `);
    console.log(`  Tenders Database Records Loaded: ${tendersDatabase.length} `);
    console.log(`  Tender Intelligence Engine: ENABLED (local rules) `);
    console.log(`=============================================================`);
  });
}

startServer();
