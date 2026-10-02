import React from 'react';
import { 
  Database, 
  Terminal, 
  ShieldCheck, 
  Code2, 
  MapPin, 
  BarChart3, 
  RefreshCw, 
  FileSpreadsheet,
  BellRing,
  Server,
  Sparkles,
  Star
} from 'lucide-react';
import { BackendHealth } from '../services/api';

interface HeaderProps {
  activeTab: 'database' | 'scraper' | 'python_code' | 'states' | 'analytics' | 'alerts' | 'ai_copilot';
  setActiveTab: (tab: 'database' | 'scraper' | 'python_code' | 'states' | 'analytics' | 'alerts' | 'ai_copilot') => void;
  totalTenders: number;
  totalBudgetFormatted: string;
  isScrapingRunning: boolean;
  onQuickExport: () => void;
  unreadAlertsCount: number;
  backendHealth?: BackendHealth | null;
  bookmarkedCount?: number;
}

interface TabItem {
  id: 'database' | 'scraper' | 'alerts' | 'ai_copilot' | 'python_code' | 'states' | 'analytics';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  pulse?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalTenders,
  totalBudgetFormatted,
  isScrapingRunning,
  onQuickExport,
  unreadAlertsCount,
  backendHealth,
  bookmarkedCount = 0,
}) => {
  const tabs: TabItem[] = [
    { id: 'database', label: 'Tenders Database', icon: Database, badge: totalTenders },
    { id: 'ai_copilot', label: 'AI Bid Copilot', icon: Sparkles, badge: 'Tender Intelligence' },
    { id: 'scraper', label: 'Scraper Runner & Logs', icon: Terminal, pulse: isScrapingRunning },
    { id: 'alerts', label: 'Tender Alerts', icon: BellRing, badge: unreadAlertsCount > 0 ? `${unreadAlertsCount} New` : undefined, pulse: unreadAlertsCount > 0 },
    { id: 'python_code', label: 'Python Script (v2.6)', icon: Code2 },
    { id: 'states', label: 'Portals Registry (40)', icon: MapPin },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 py-1.5 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-200">
            GePNIC National Tender Aggregator
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300">
            Covering All 28 States, 8 UTs & Central Portals (mahatenders, etender.up, eproc.rajasthan, wbtenders, CPPP & IREPS)
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>REST API Active</span>
            {backendHealth && (
              <span className="text-slate-400">({backendHealth.databaseCount} in Disk DB)</span>
            )}
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">Compiled Volume:</span>
            <strong className="text-emerald-400 font-mono">{totalBudgetFormatted}</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1.5">
            <span className="text-slate-400">Records:</span>
            <strong className="text-sky-300 font-mono">{totalTenders} Tenders</strong>
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{bookmarkedCount} Saved</span>
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Tender Compiler
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                Multi-State v2.6
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Live portal fetch + session-aware HTML parsing + persistent tender database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
              activeTab === 'alerts'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="View Caught Keyword Tender Alerts"
          >
            <BellRing className={`w-3.5 h-3.5 ${unreadAlertsCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-500'}`} />
            <span>Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={onQuickExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            title="Download compiled records as CSV / Excel ready"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={() => setActiveTab('scraper')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all ${
              isScrapingRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScrapingRunning ? 'animate-spin' : ''}`} />
            <span>{isScrapingRunning ? 'Scraping in Progress...' : 'Launch Scraper Run'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-indigo-200 text-indigo-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {'pulse' in tab && tab.pulse && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
