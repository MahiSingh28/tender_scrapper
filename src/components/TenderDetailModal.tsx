import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Calendar, 
  Building2, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Coins, 
  Layers, 
  ShieldCheck, 
  Clock, 
  ArrowUpRight,
  Copy,
  Check,
  Star,
  Sparkles,
  BrainCircuit,
  AlertTriangle,
  Award,
  Scale,
  Send,
  RefreshCw
} from 'lucide-react';
import { TenderItem, TenderAiAnalysis } from '../types/tender';
import { calculateDaysLeft, formatIndianCurrency } from '../utils/tenderUtils';
import { analyzeTenderWithAi, askTenderAiQuestion } from '../services/api';

interface TenderDetailModalProps {
  tender: TenderItem | null;
  onClose: () => void;
  onToggleBookmark?: (tenderId: string) => void;
  initialTab?: 'details' | 'ai' | 'qa';
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({ 
  tender, 
  onClose,
  onToggleBookmark,
  initialTab = 'details'
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ai' | 'qa'>(initialTab);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<TenderAiAnalysis | null>(tender?.aiAnalysis || null);

  // Q&A
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);

  if (!tender) return null;

  const daysInfo = calculateDaysLeft(tender.bidSubmissionEndDate);

  const handleCopyId = () => {
    navigator.clipboard.writeText(tender.tenderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await analyzeTenderWithAi(tender);
      if (res) {
        setAiAnalysis(res);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendQuestion = async (qText?: string) => {
    const q = qText || question;
    if (!q.trim() || isAsking) return;
    setChatLog(prev => [...prev, { sender: 'user', text: q }]);
    setQuestion('');
    setIsAsking(true);
    try {
      const ans = await askTenderAiQuestion(tender, q);
      setChatLog(prev => [...prev, { sender: 'ai', text: ans }]);
    } catch {
      setChatLog(prev => [...prev, { sender: 'ai', text: 'Error contacting AI engine.' }]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                {tender.state}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-700">
                {tender.category}
              </span>
              {tender.isIframeExtracted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <Layers className="w-3 h-3" />
                  Iframe Extracted
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {tender.title}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>Tender ID: <code className="font-mono text-slate-800 bg-slate-200/70 px-1.5 py-0.5 rounded">{tender.tenderId}</code></span>
              <button 
                onClick={handleCopyId}
                className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark?.(tender.tenderId)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                tender.isBookmarked
                  ? 'bg-amber-50 text-amber-600 border-amber-300 shadow-xs'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title={tender.isBookmarked ? 'Remove Bookmark' : 'Bookmark Tender'}
            >
              <Star className={`w-4 h-4 ${tender.isBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-white border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Technical Specs & Commercials</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('ai');
              if (!aiAnalysis) handleRunAiAnalysis();
            }}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Bid Risk & Viability (Tender Intelligence)</span>
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'qa'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ask AI RFP Copilot</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 flex-1">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Key Value Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Estimated Value</span>
                  <span className="text-lg font-bold text-emerald-700 font-mono">
                    {tender.formattedBudget}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    ₹{tender.estimatedBudgetInr.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Submission Deadline</span>
                  <span className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {tender.bidSubmissionEndDate}
                  </span>
                  <span className={`text-[11px] font-semibold mt-1 inline-block ${daysInfo.isUrgent ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {daysInfo.days} days remaining
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Earnest Money (EMD)</span>
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    ₹{tender.emdAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Tender Fee: ₹{tender.tenderFee.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Bid Opening Date</span>
                  <span className="text-sm font-bold text-slate-900 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {tender.tenderOpeningDate}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Published: {tender.publishDate}
                  </span>
                </div>
              </div>

              {/* Scope of Work */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Work Description & Technical Scope
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm leading-relaxed text-slate-800">
                  {tender.workDescription}
                </div>
              </div>

              {/* Organization & Location Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Procuring Entity Information
                  </span>
                  <div className="space-y-1 text-slate-600">
                    <div><strong className="text-slate-700">Authority:</strong> {tender.organization}</div>
                    <div><strong className="text-slate-700">Department:</strong> {tender.department}</div>
                    <div><strong className="text-slate-700">Reference:</strong> {tender.tenderReferenceNumber}</div>
                  </div>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl space-y-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Project Location & Logistics
                  </span>
                  <div className="space-y-1 text-slate-600">
                    <div><strong className="text-slate-700">Work Location:</strong> {tender.location}</div>
                    <div><strong className="text-slate-700">Postal Code:</strong> {tender.pincode || 'N/A'}</div>
                    <div><strong className="text-slate-700">Portal Endpoint:</strong> GePNIC Portal Link Below</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI BID EVALUATION */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              {isAnalyzing ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">Evaluating RFP with Tender Intelligence Flash...</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Auditing commercial viability, EMD requirements, and technical criteria against Indian General Financial Rules (GFR 2017).
                  </p>
                </div>
              ) : aiAnalysis ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-200 flex flex-col items-center justify-center font-mono">
                        <span className="text-lg font-black text-indigo-700">{aiAnalysis.viabilityScore}</span>
                        <span className="text-[8px] text-slate-500">SCORE</span>
                      </div>
                      <div>
                        <span className="text-xs text-indigo-900 font-semibold">AI Bid Recommendation</span>
                        <div className="text-sm font-black text-indigo-800">{aiAnalysis.bidRecommendation}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleRunAiAnalysis}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-indigo-200 text-xs font-bold text-indigo-700 transition-colors cursor-pointer"
                    >
                      Re-Analyze
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1.5">Executive AI Summary</h4>
                    <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                      {aiAnalysis.executiveSummary}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-rose-600 mb-1.5 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Critical Bid Risks & Pitfalls
                    </h4>
                    <div className="space-y-1.5">
                      {aiAnalysis.keyRisks.map((risk, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 text-xs text-rose-950 flex items-start gap-2">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Eligibility Checklist
                    </h4>
                    <div className="space-y-1">
                      {aiAnalysis.eligibilityChecklist.map((item, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 text-xs text-slate-800 flex items-start gap-2">
                          <input type="checkbox" defaultChecked className="mt-0.5 accent-indigo-600" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <BrainCircuit className="w-8 h-8 text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Run Tender Intelligence Flash to evaluate this tender.</p>
                  <button
                    onClick={handleRunAiAnalysis}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                  >
                    Generate AI Evaluation
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AI RFP COPILOT */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="h-64 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {chatLog.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    Ask any question about this tender's terms, GFR compliance, EMD, or BoQ.
                  </div>
                ) : (
                  chatLog.map((c, i) => (
                    <div key={i} className={`flex flex-col ${c.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-2.5 rounded-xl max-w-[85%] ${
                        c.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-800 border border-slate-200'
                      }`}>
                        <p className="whitespace-pre-line">{c.text}</p>
                      </div>
                    </div>
                  ))
                )}
                {isAsking && (
                  <div className="text-slate-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Tender Intelligence is answering...</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Can MSMEs get EMD exemption for this tender?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendQuestion();
                  }}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
                <button
                  onClick={() => handleSendQuestion()}
                  disabled={isAsking || !question.trim()}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark?.(tender.tenderId)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                tender.isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${tender.isBookmarked ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span>{tender.isBookmarked ? 'Bookmarked' : 'Bookmark Tender'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={tender.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <span>Open on Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
