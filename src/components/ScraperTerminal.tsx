import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Terminal, 
  Settings, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw,
  Globe2,
  SlidersHorizontal,
  ChevronDown,
  BellRing,
  Filter,
  Search,
  ArrowDownCircle,
  FileText
} from 'lucide-react';
import { INDIAN_STATES_PORTALS } from '../data/statesData';
import { AlertRule, ScraperLogMessage, TenderAlertNotification, TenderItem } from '../types/tender';
import { findMatchingAlertKeywords } from '../utils/alertManager';
import { fetchScraperLogs, postScraperLog, clearScraperLogs, runLiveScraper, startManualCaptchaScraper, continueManualCaptchaScraper, stopManualCaptchaScraper } from '../services/api';

interface ScraperTerminalProps {
  onTendersCollected: (newTenders: TenderItem[]) => void;
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  alertRules?: AlertRule[];
  onAlertTriggered?: (notif: TenderAlertNotification) => void;
}

export const ScraperTerminal: React.FC<ScraperTerminalProps> = ({
  onTendersCollected,
  isRunning,
  setIsRunning,
  alertRules = [],
  onAlertTriggered,
}) => {
  const [selectedStates, setSelectedStates] = useState<string[]>(['MH', 'UP', 'RJ']);
  const [maxPerState, setMaxPerState] = useState<number>(100);
  const [verificationMode, setVerificationMode] = useState<'public_latest' | 'manual_captcha'>('manual_captcha');
  const [manualCaptchaReady, setManualCaptchaReady] = useState(false);
  const [isContinuingCaptcha, setIsContinuingCaptcha] = useState(false);
  const [manualStateName, setManualStateName] = useState('');
  const [enableIframeSwitch, setEnableIframeSwitch] = useState<boolean>(true);
  const [normalizeBudgets, setNormalizeBudgets] = useState<boolean>(true);

  // Logging & Filtering State
  const [logFilter, setLogFilter] = useState<'ALL' | 'info' | 'frame' | 'success' | 'warning' | 'error'>('ALL');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);

  const [logs, setLogs] = useState<ScraperLogMessage[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      state: 'SYSTEM',
      level: 'info',
      message: 'Live GePNIC scraper ready. No mock records are generated.',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      state: 'SYSTEM',
      level: 'info',
      message: 'Public latest-tender pages are fetched with a fresh session for each selected portal.',
    }
  ]);

  const [scrapedCount, setScrapedCount] = useState<number>(0);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [activeStateIndex, setActiveStateIndex] = useState<number>(0);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Synchronize logs with backend on mount
  useEffect(() => {
    async function loadBackendLogs() {
      const serverLogs = await fetchScraperLogs();
      if (serverLogs && serverLogs.length > 0) {
        setLogs(serverLogs);
      }
    }
    loadBackendLogs();
  }, []);

  // Auto scroll terminal
  useEffect(() => {
    if (autoScroll) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Log filter computation
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilter !== 'ALL' && log.level !== logFilter) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        return log.message.toLowerCase().includes(q) || log.state.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, logFilter, logSearchQuery]);

  // Log Telemetry Stats
  const logStats = useMemo(() => {
    return {
      total: logs.length,
      iframes: logs.filter(l => l.level === 'frame').length,
      successes: logs.filter(l => l.level === 'success').length,
      warnings: logs.filter(l => l.level === 'warning').length,
      errors: logs.filter(l => l.level === 'error').length,
    };
  }, [logs]);

  const handleStartScrape = async () => {
    if (!selectedStates.length || isRunning) return;
    setIsRunning(true);
    setScrapedCount(0);
    setCurrentProgress(0);
    setManualCaptchaReady(false);

    const startLog: ScraperLogMessage = {
      id: `start-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      state: 'RUNNER',
      level: 'info',
      message: `Starting real portal extraction for ${selectedStates.length} portal(s): ${selectedStates.join(', ')}. No synthetic tender rows will be created.`,
    };
    setLogs(prev => [...prev, startLog]);
    await postScraperLog(startLog);

    try {
      if (true) {
        const result = await startManualCaptchaScraper({
          stateCodes: selectedStates,
          maxTendersPerState: maxPerState,
        });
        setManualStateName(result.stateName || result.state || 'Selected portal');
        setManualCaptchaReady(true);
        const log: ScraperLogMessage = {
          id: `captcha-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          state: result.stateName || result.state || 'PORTAL',
          level: 'warning',
          message: 'A real government-portal browser window is open. Solve the CAPTCHA there, then click Continue CAPTCHA & Extract below.',
        };
        setLogs(prev => [...prev, log]);
        await postScraperLog(log);
        return;
      }

      const result = await runLiveScraper({ stateCodes: selectedStates, maxTendersPerState: maxPerState });
      if (result.success) {
        setScrapedCount(result.totalCollected);
        setCurrentProgress(100);
        if (result.tenders.length) onTendersCollected(result.tenders);
        const doneLog: ScraperLogMessage = {
          id: `done-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          state: 'COMPILER',
          level: result.totalCollected ? 'success' : 'warning',
          message: result.totalCollected
            ? `LIVE extraction finished: ${result.totalCollected} real tender records collected. Database now contains ${result.databaseSize} records.`
            : 'No live tender rows were returned. No fake records were inserted.',
        };
        setLogs(prev => [...prev, doneLog]);
        await postScraperLog(doneLog);
      } else {
        throw new Error(result.error || 'Live scraper failed.');
      }
      setIsRunning(false);
    } catch (error: any) {
      const log: ScraperLogMessage = {
        id: `error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        state: 'COMPILER',
        level: 'error',
        message: error?.message || 'Live scraper failed.',
      };
      setLogs(prev => [...prev, log]);
      await postScraperLog(log);
      setIsRunning(false);
    }
  };

  const handleContinueCaptcha = async () => {
    if (!manualCaptchaReady || isContinuingCaptcha) return;
    setIsContinuingCaptcha(true);
    try {
      const result = await continueManualCaptchaScraper();
      setScrapedCount(result.totalCollected || 0);
      setCurrentProgress(result.done ? 100 : Math.round(((result.stateIndex || 0) / Math.max(1, selectedStates.length)) * 100));
      if (result.tenders?.length) onTendersCollected(result.tenders);
      if (result.done) {
        setManualCaptchaReady(false);
        setManualStateName('');
        setIsRunning(false);
      } else {
        setManualStateName(result.stateName || result.state || 'Next portal');
        setManualCaptchaReady(true);
      }
      const log: ScraperLogMessage = {
        id: `continue-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        state: result.stateName || result.state || 'COMPILER',
        level: result.tenders?.length ? 'success' : 'warning',
        message: result.message || `Extracted ${result.tenders?.length || 0} real tender records.`,
        tendersFound: result.tenders?.length || 0,
      };
      setLogs(prev => [...prev, log]);
      await postScraperLog(log);
    } catch (error: any) {
      const log: ScraperLogMessage = {
        id: `captcha-error-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        state: manualStateName || 'PORTAL',
        level: 'error',
        message: error?.message || 'Could not continue after CAPTCHA.',
      };
      setLogs(prev => [...prev, log]);
      await postScraperLog(log);
    } finally {
      setIsContinuingCaptcha(false);
    }
  };

  const handleStopScrape = async () => {
    await stopManualCaptchaScraper();
    setManualCaptchaReady(false);
    setManualStateName('');
    setIsRunning(false);
    const stopLog: ScraperLogMessage = {
      id: `stop-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      state: 'RUNNER',
      level: 'warning',
      message: '⏸ Scraper run halted by user. Retaining compiled records.',
    };
    setLogs(prev => [...prev, stopLog]);
    await postScraperLog(stopLog);
  };

  const handleClearLogs = async () => {
    setLogs([]);
    await clearScraperLogs();
  };

  const handleCopyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.state}] [${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.state}] [${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gepnic_scraper_execution_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSelectAllStates = () => {
    if (selectedStates.length === INDIAN_STATES_PORTALS.length) {
      setSelectedStates(['MH', 'UP', 'RJ']);
    } else {
      setSelectedStates(INDIAN_STATES_PORTALS.map(p => p.code));
    }
  };

  const toggleState = (code: string) => {
    if (selectedStates.includes(code)) {
      if (selectedStates.length > 1) {
        setSelectedStates(selectedStates.filter(c => c !== code));
      }
    } else {
      setSelectedStates([...selectedStates, code]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Configuration Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-200 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              Multi-State Scraper Execution Parameters
            </h3>
            <p className="text-xs text-slate-500">
              Configure a real browser session, manual CAPTCHA verification, and pagination limits.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                onClick={handleStartScrape}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{verificationMode === 'manual_captcha' ? 'Open Live CAPTCHA Session' : 'Start Compilation Run'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopScrape}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Halt Execution</span>
              </button>
            )}
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          {/* Max rows per state */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex justify-between">
              <span>Max Tenders Per State:</span>
              <span className="text-indigo-600 font-mono">{maxPerState}</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="20"
                max="500"
                step="20"
                value={maxPerState}
                disabled={isRunning}
                onChange={(e) => setMaxPerState(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
              <span className="font-mono font-bold text-xs bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md min-w-[70px] text-center">
                {maxPerState} rows
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              Reads live records returned by the selected government portal; fewer may be returned.
            </span>
          </div>

          {/* Verification mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Portal Access Mode:
            </label>
            <div className="w-full text-xs bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-amber-900 font-semibold">
              Live browser + manual CAPTCHA
            </div>
            <span className="text-[11px] text-slate-400 block">
              The real government portal opens in a visible browser. You solve its CAPTCHA; the compiler then extracts the returned tenders in that same session.
            </span>
          </div>

          {/* Flags */}
          <div className="space-y-2 pt-1 text-xs">
            <label className="text-xs font-bold text-slate-700 block">
              Driver Directives:
            </label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableIframeSwitch}
                  disabled={isRunning}
                  onChange={(e) => setEnableIframeSwitch(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="font-medium">Switch to PageFrame iframe</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalizeBudgets}
                  disabled={isRunning}
                  onChange={(e) => setNormalizeBudgets(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                />
                <span className="font-medium">Normalize INR Budget (Lakhs/Crores to float)</span>
              </label>
            </div>
          </div>
        </div>

        {/* State Selector Chips */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold text-slate-700">
              Select States to Compile ({selectedStates.length} of {INDIAN_STATES_PORTALS.length} selected):
            </label>
            <button
              onClick={toggleSelectAllStates}
              disabled={isRunning}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {selectedStates.length === INDIAN_STATES_PORTALS.length ? 'Deselect All' : 'Select All Portals'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
            {INDIAN_STATES_PORTALS.map((portal) => {
              const isSelected = selectedStates.includes(portal.code);
              return (
                <button
                  key={portal.code}
                  disabled={isRunning}
                  onClick={() => toggleState(portal.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {portal.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manual CAPTCHA handoff */}
      {manualCaptchaReady && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    CAPTCHA verification required
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 border border-amber-200">
                    {manualStateName || 'Current portal'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Solve the CAPTCHA in the separate government-portal browser window. Then return here and continue the same session.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinueCaptcha}
              disabled={isContinuingCaptcha}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isContinuingCaptcha ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isContinuingCaptcha ? 'Extracting live tenders...' : 'Continue CAPTCHA & Extract'}
            </button>
          </div>
        </div>
      )}

      {/* Log Telemetry Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Log Events</span>
          <span className="font-mono text-base font-bold text-slate-900">{logStats.total}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-sky-500 block">Iframe Switches</span>
          <span className="font-mono text-base font-bold text-sky-700">{logStats.iframes}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-500 block">Live Successes</span>
          <span className="font-mono text-base font-bold text-emerald-700">{logStats.successes}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-500 block">Warnings</span>
          <span className="font-mono text-base font-bold text-amber-700">{logStats.warnings}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-rose-500 block">Exceptions</span>
          <span className="font-mono text-base font-bold text-rose-700">{logStats.errors}</span>
        </div>
      </div>

      {/* Live Terminal Stream */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              gepnic-live-scraper --multi-state
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mr-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                RUNNING (Harvested: {scrapedCount})
              </span>
            )}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                autoScroll ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Auto-scroll to latest log message"
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleDownloadLogs}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Download Scraper Log File (.log)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCopyLogs}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
              title="Copy All Logs"
            >
              {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
              title="Clear Terminal & Reset Backend Logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar inside Terminal */}
        <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ALL', 'info', 'frame', 'success', 'warning', 'error'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold transition-colors cursor-pointer ${
                  logFilter === lvl
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in logs..."
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 w-48 font-mono"
            />
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-xs text-slate-300 space-y-2 h-96 overflow-y-auto scrollbar-thin">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              No log messages matching filter "{logFilter}".
            </div>
          ) : (
            filteredLogs.map((log) => {
              let color = 'text-slate-300';
              if (log.level === 'success') color = 'text-emerald-400';
              if (log.level === 'warning') color = 'text-amber-400';
              if (log.level === 'error') color = 'text-rose-400';
              if (log.level === 'frame') color = 'text-sky-400';

              return (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-slate-600 select-none shrink-0">{log.timestamp}</span>
                  <span className="text-indigo-400 font-semibold shrink-0">[{log.state}]</span>
                  <span className={color}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Progress Footer */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Harvested:</span>
            <strong className="text-emerald-400">{scrapedCount} Tenders</strong>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">States Active:</span>
            <span className="text-sky-300">{selectedStates.length} Portals</span>
          </div>

          <div className="w-48 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
