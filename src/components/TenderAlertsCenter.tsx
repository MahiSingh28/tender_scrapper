import React, { useState } from 'react';
import { 
  Bell, 
  BellRing, 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Monitor, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Sparkles, 
  Eye, 
  Filter, 
  Zap, 
  Check, 
  Clock, 
  Coins, 
  Tag
} from 'lucide-react';
import { AlertRule, TenderAlertNotification, TenderItem } from '../types/tender';
import { 
  requestDesktopNotificationPermission, 
  triggerDesktopNotification, 
  playAlertChime 
} from '../utils/alertManager';
import { formatIndianCurrency } from '../utils/tenderUtils';

interface TenderAlertsCenterProps {
  alertRules: AlertRule[];
  onUpdateRules: (rules: AlertRule[]) => void;
  notifications: TenderAlertNotification[];
  onClearNotifications: () => void;
  onMarkAllAsRead: () => void;
  onSelectTender: (tender: TenderItem) => void;
}

export const TenderAlertsCenter: React.FC<TenderAlertsCenterProps> = ({
  alertRules,
  onUpdateRules,
  notifications,
  onClearNotifications,
  onMarkAllAsRead,
  onSelectTender,
}) => {
  const [newKeyword, setNewKeyword] = useState('');
  const [newMinBudget, setNewMinBudget] = useState<number>(0);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [activeSubTab, setActiveSubTab] = useState<'feed' | 'rules'>('feed');

  // Handle requesting desktop notifications
  const handleEnableDesktopNotifications = async () => {
    const perm = await requestDesktopNotificationPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      triggerDesktopNotification('Tender Compiler Alerts Active', {
        body: 'You will now receive desktop alerts when tenders matching your keywords are scraped!',
      });
      playAlertChime();
    }
  };

  // Add rule
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed) return;

    if (alertRules.some(r => r.keyword.toLowerCase() === trimmed)) {
      alert('This keyword alert already exists.');
      return;
    }

    const colors = ['#4f46e5', '#d97706', '#059669', '#e11d48', '#0284c7', '#7c3aed'];
    const randomColor = colors[alertRules.length % colors.length];

    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      keyword: trimmed,
      minBudgetInr: newMinBudget > 0 ? newMinBudget : undefined,
      enabled: true,
      color: randomColor,
      soundEnabled: true,
      desktopNotify: true,
    };

    onUpdateRules([...alertRules, newRule]);
    setNewKeyword('');
    setNewMinBudget(0);
  };

  const handleToggleRule = (id: string) => {
    onUpdateRules(
      alertRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    );
  };

  const handleDeleteRule = (id: string) => {
    onUpdateRules(alertRules.filter(r => r.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Alert Status & Desktop Notifications Toggle */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <BellRing className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
              Live Scraping Tender Alerts Engine
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Real-Time Keyword & Budget Tender Watcher
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              When the GePNIC multi-state scraper detects new tenders matching keywords like 
              <strong className="text-amber-300"> 'civil works'</strong> or <strong className="text-indigo-300">'IT infrastructure'</strong>, 
              it fires an instant desktop browser notification, audio chime, and highlights them in the dashboard!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Desktop Notification Button */}
            {permissionStatus !== 'granted' ? (
              <button
                onClick={handleEnableDesktopNotifications}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-sky-300" />
                <span>Enable Desktop Notifications</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Desktop Alerts Active</span>
              </span>
            )}

            {/* Test Alert Button */}
            
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('feed')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'feed'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts Feed ({notifications.length})</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                {unreadCount} new
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeSubTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Keyword Rules ({alertRules.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ALERTS FEED */}
      {activeSubTab === 'feed' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-4 h-4 text-indigo-600" />
                Detected Tender Alerts Log
              </h3>
              <p className="text-xs text-slate-500">
                Tenders caught by keyword match during current & previous scraper runs.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearNotifications}
                  className="text-slate-400 hover:text-rose-600 font-medium ml-2"
                >
                  Clear history
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Bell className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <div className="text-sm font-semibold text-slate-700">No alerts triggered yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Run the live scraper to populate alerts from actual portal records. Alerts are generated from the configured keyword rules.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => onSelectTender(notif.tenderItem)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    !notif.read
                      ? 'bg-indigo-50/60 border-indigo-200 hover:border-indigo-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-amber-700" />
                        Matched: "{notif.matchedKeyword}"
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {notif.tenderId}
                      </span>
                      <span className="font-bold text-xs text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                        {notif.state}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notif.timestamp}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {notif.tenderTitle}
                    </h4>

                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{notif.organization}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Budget: {notif.budgetFormatted}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTender(notif.tenderItem);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Tender</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: KEYWORD RULES CONFIGURATION */}
      {activeSubTab === 'rules' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              Configure Keyword Watchlist Rules
            </h3>
            <p className="text-xs text-slate-500">
              Add keywords to monitor. Any incoming tender with these keywords in its title or work scope will trigger an alert.
            </p>
          </div>

          {/* Add Rule Form */}
          <form onSubmit={handleAddRule} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Add New Keyword Watcher
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <input
                  type="text"
                  placeholder="e.g., civil works, IT infrastructure, fiber, solar, hospital, drainage..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={newMinBudget}
                  onChange={(e) => setNewMinBudget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={0}>Any Budget (All)</option>
                  <option value={10000000}>Min ₹1.00 Cr+</option>
                  <option value={50000000}>Min ₹5.00 Cr+</option>
                  <option value={200000000}>Min ₹20.00 Cr+</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>
          </form>

          {/* Rules List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">
              Active Monitored Keywords ({alertRules.length}):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alertRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    rule.enabled
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer accent-indigo-600"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 capitalize flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: rule.color }}
                        ></span>
                        "{rule.keyword}"
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {rule.minBudgetInr ? `Min budget: ${formatIndianCurrency(rule.minBudgetInr)}` : 'Any budget threshold'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      rule.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {rule.enabled ? 'Active' : 'Muted'}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
