export type IndianRegionType = 'state' | 'ut' | 'central';

export interface StatePortal {
  id: string;
  name: string;
  code: string;
  type: IndianRegionType;
  portalUrl: string;
  engine: 'NIC GePNIC' | 'CPPP National' | 'NextGen eProc' | 'Custom State NIC';
  iframeSelector: string;
  captchaType: 'Distorted 6-Char Alphanumeric' | 'Math Addition' | 'Image Grid' | 'Session Token / None';
  hasIframe: boolean;
  loadNextMechanism: 'javascript:loadNext()' | 'Page.do?pager.offset=' | 'AJAX NextLink' | 'table#tenders_next';
  activeTendersEstimate: number;
  status: 'online' | 'degraded' | 'captcha_heavy';
}

export interface TenderItem {
  id: string;
  tenderId: string;
  title: string;
  organization: string;
  department: string;
  state: string;
  stateCode: string;
  category: 'Civil Works' | 'Roads & Bridges' | 'Healthcare & Pharma' | 'IT & Telecom' | 'Water Supply & Sanitation' | 'Power & Energy' | 'Education & Services' | 'Security & Facility';
  publishDate: string; // ISO format: YYYY-MM-DD
  bidSubmissionStartDate: string;
  bidSubmissionEndDate: string; // ISO format
  tenderOpeningDate: string;
  estimatedBudgetInr: number; // Pure number in rupees
  formattedBudget: string; // e.g. "₹4.50 Cr" or "₹45 Lakhs"
  tenderFee: number;
  emdAmount: number;
  detailUrl: string; // FrontEndTender detail link
  tenderReferenceNumber: string;
  location: string;
  pincode?: string;
  workDescription: string;
  documentsCount: number;
  isIframeExtracted: boolean;
  scrapedAt: string;
  status: 'Open' | 'Closing Soon' | 'Under Evaluation';
  matchedAlerts?: string[]; // Keywords that triggered an alert
  isBookmarked?: boolean;
  aiAnalysis?: TenderAiAnalysis;
}

export interface TenderAiAnalysis {
  executiveSummary: string;
  bidRecommendation: 'HIGHLY RECOMMENDED' | 'BID WITH CAUTION' | 'NOT RECOMMENDED';
  viabilityScore: number; // 0 to 100
  keyRisks: string[];
  eligibilityChecklist: string[];
  strategicAdvantages: string[];
  complianceNotes: string;
  analyzedAt: string;
}

export interface AlertRule {
  id: string;
  keyword: string;
  category?: string;
  minBudgetInr?: number;
  enabled: boolean;
  color: string;
  soundEnabled: boolean;
  desktopNotify: boolean;
}

export interface TenderAlertNotification {
  id: string;
  tenderId: string;
  tenderTitle: string;
  organization: string;
  state: string;
  budgetFormatted: string;
  matchedKeyword: string;
  timestamp: string;
  tenderItem: TenderItem;
  read: boolean;
}

export interface ScrapeRunConfig {
  selectedStates: string[];
  maxTendersPerState: number;
  captchaStrategy: 'public_latest' | 'manual_captcha';
  scrapeIframes: boolean;
  cleanBudgets: boolean;
  parallelThreads: number;
}

export interface ScraperLogMessage {
  id: string;
  timestamp: string;
  state: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'frame';
  message: string;
  details?: string;
  page?: number;
  tendersFound?: number;
}
