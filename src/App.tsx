import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { TenderList } from './components/TenderList';
import { TenderDetailModal } from './components/TenderDetailModal';
import { ScraperTerminal } from './components/ScraperTerminal';
import { PythonScriptViewer } from './components/PythonScriptViewer';
import { StateRegistryView } from './components/StateRegistryView';
import { AnalyticsView } from './components/AnalyticsView';
import { TenderAlertsCenter } from './components/TenderAlertsCenter';
import { AlertToast } from './components/AlertToast';
import { AiTenderIntelligence } from './components/AiTenderIntelligence';
import { formatIndianCurrency } from './utils/tenderUtils';
import { AlertRule, TenderAlertNotification, TenderItem } from './types/tender';
import { DEFAULT_ALERT_RULES, playAlertChime, triggerDesktopNotification } from './utils/alertManager';
import { 
  fetchLiveTenders, 
  saveLiveTender, 
  toggleTenderBookmark,
  fetchLiveAlertRules, 
  createLiveAlertRule, 
  deleteLiveAlertRule,
  fetchLiveNotifications,
  clearLiveNotifications,
  checkBackendHealth,
  BackendHealth
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'database' | 'scraper' | 'python_code' | 'states' | 'analytics' | 'alerts' | 'ai_copilot'>('database');
  const [tenders, setTenders] = useState<TenderItem[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'details' | 'ai' | 'qa'>('details');
  const [isScrapingRunning, setIsScrapingRunning] = useState<boolean>(false);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);

  // Alert State
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES);
  const [notifications, setNotifications] = useState<TenderAlertNotification[]>([]);
  const [activeAlertToast, setActiveAlertToast] = useState<TenderAlertNotification | null>(null);

  // Synchronize with real backend on load
  useEffect(() => {
    async function initBackendData() {
      // 1. Health check
      const health = await checkBackendHealth();
      if (health) {
        setBackendHealth(health);
      }

      // 2. Load tenders from backend disk storage
      const tenderResp = await fetchLiveTenders();
      if (tenderResp && tenderResp.tenders && tenderResp.tenders.length > 0) {
        setTenders(tenderResp.tenders);
      }

      // 3. Load alert rules
      const rules = await fetchLiveAlertRules();
      if (rules && rules.length > 0) {
        setAlertRules(rules);
      }

      // 4. Load notifications
      const notifs = await fetchLiveNotifications();
      if (notifs && notifs.length > 0) {
        setNotifications(notifs);
      }
    }

    initBackendData();
  }, []);

  // Total bookmarked count
  const bookmarkedCount = useMemo(() => {
    return tenders.filter(t => t.isBookmarked).length;
  }, [tenders]);

  // Toggle bookmark handler
  const handleToggleBookmark = async (tenderId: string) => {
    setTenders(prev => prev.map(t => {
      if (t.tenderId === tenderId || t.id === tenderId) {
        return { ...t, isBookmarked: !t.isBookmarked };
      }
      return t;
    }));

    if (selectedTender && (selectedTender.tenderId === tenderId || selectedTender.id === tenderId)) {
      setSelectedTender(curr => curr ? { ...curr, isBookmarked: !curr.isBookmarked } : null);
    }

    await toggleTenderBookmark(tenderId);
  };

  const handleOpenTender = (tender: TenderItem, initialTab?: 'details' | 'ai' | 'qa') => {
    setSelectedTender(tender);
    setModalInitialTab(initialTab || 'details');
  };

  // Unread alerts count
  const unreadAlertsCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Handler when scraper catches a matching tender alert
  const handleAlertTriggered = (notif: TenderAlertNotification) => {
    setNotifications(prev => [notif, ...prev]);
    setActiveAlertToast(notif);
    
    // Play synthesized chime
    playAlertChime();

    // Trigger desktop notification if granted
    triggerDesktopNotification(`🔔 Tender Alert: "${notif.matchedKeyword.toUpperCase()}"`, {
      body: `${notif.tenderTitle} (${notif.budgetFormatted}) in ${notif.state}`,
    }, () => {
      setSelectedTender(notif.tenderItem);
    });

    // Auto dismiss toast after 8 seconds
    setTimeout(() => {
      setActiveAlertToast(curr => curr?.id === notif.id ? null : curr);
    }, 8000);
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    fetch('/api/notifications/mark-read', { method: 'POST' }).catch(() => {});
  };

  const handleClearNotifications = async () => {
    await clearLiveNotifications();
    setNotifications([]);
  };

  // Total budget calculation
  const totalBudgetVolume = useMemo(() => {
    return tenders.reduce((acc, t) => acc + t.estimatedBudgetInr, 0);
  }, [tenders]);

  const totalBudgetFormatted = formatIndianCurrency(totalBudgetVolume);

  // Append newly scraped tenders & persist to backend database
  const handleTendersCollected = (newTenders: TenderItem[]) => {
    // Persist each new tender to disk
    newTenders.forEach(t => saveLiveTender(t));

    setTenders(prev => {
      const existingIds = new Set(prev.map(p => p.tenderId));
      const filteredNew = newTenders.filter(n => !existingIds.has(n.tenderId));
      return [...filteredNew, ...prev];
    });
  };

  // Export to CSV with UTF-8 BOM for Microsoft Excel compatibility
  const handleExportCsv = (itemsToExport: TenderItem[]) => {
    const headers = [
      'Tender ID',
      'Title',
      'Organization',
      'Department',
      'State',
      'Category',
      'Publish Date',
      'Bid Submission End Date',
      'Tender Opening Date',
      'Estimated Budget INR',
      'EMD Amount INR',
      'Tender Fee INR',
      'Location',
      'PIN Code',
      'Tender Ref Number',
      'Matched Alerts',
      'Detail Portal URL',
      'Scraped At'
    ];

    const escapeCsv = (val: any) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = itemsToExport.map(t => [
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
      escapeCsv(t.matchedAlerts?.join('; ') || ''),
      escapeCsv(t.detailUrl),
      escapeCsv(t.scrapedAt)
    ].join(','));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gepnic_compiled_tenders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const handleExportJson = (itemsToExport: TenderItem[]) => {
    const jsonStr = JSON.stringify(itemsToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gepnic_compiled_tenders_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalTenders={tenders.length}
        totalBudgetFormatted={totalBudgetFormatted}
        isScrapingRunning={isScrapingRunning}
        onQuickExport={() => handleExportCsv(tenders)}
        unreadAlertsCount={unreadAlertsCount}
        backendHealth={backendHealth}
        bookmarkedCount={bookmarkedCount}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'database' && (
          <TenderList
            tenders={tenders}
            onSelectTender={handleOpenTender}
            onExportCsv={handleExportCsv}
            onExportJson={handleExportJson}
            onToggleBookmark={handleToggleBookmark}
          />
        )}

        {activeTab === 'ai_copilot' && (
          <AiTenderIntelligence
            tenders={tenders}
            onSelectTender={(t) => handleOpenTender(t, 'ai')}
          />
        )}

        {activeTab === 'scraper' && (
          <ScraperTerminal
            onTendersCollected={handleTendersCollected}
            isRunning={isScrapingRunning}
            setIsRunning={setIsScrapingRunning}
            alertRules={alertRules}
            onAlertTriggered={handleAlertTriggered}
          />
        )}

        {activeTab === 'alerts' && (
          <TenderAlertsCenter
            alertRules={alertRules}
            onUpdateRules={setAlertRules}
            notifications={notifications}
            onClearNotifications={handleClearNotifications}
            onMarkAllAsRead={handleMarkAllAsRead}
            onSelectTender={(t) => handleOpenTender(t, 'details')}
          />
        )}

        {activeTab === 'python_code' && (
          <PythonScriptViewer />
        )}

        {activeTab === 'states' && (
          <StateRegistryView />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            tenders={tenders}
            onSelectTender={(t) => handleOpenTender(t, 'details')}
          />
        )}
      </main>

      {/* Tender Inspector Modal */}
      {selectedTender && (
        <TenderDetailModal
          tender={selectedTender}
          onClose={() => setSelectedTender(null)}
          onToggleBookmark={handleToggleBookmark}
          initialTab={modalInitialTab}
        />
      )}

      {/* Floating Alert Toast */}
      <AlertToast
        notification={activeAlertToast}
        onDismiss={() => setActiveAlertToast(null)}
        onInspect={(t) => handleOpenTender(t, 'details')}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Tender Compiler Engine v2.6</span>
            <span>•</span>
            <span>All-India GePNIC / CPPP Multi-State Intelligence</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Playwright visible browser + manual CAPTCHA</span>
            <span>•</span>
            <span>Tender Intelligence Copilot</span>
            <span>•</span>
            <span>Keyword Alerts Engine</span>
            <span>•</span>
            <span>Desktop Web Notifications</span>
            <span>•</span>
            <span>Live Portal Scraper</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

