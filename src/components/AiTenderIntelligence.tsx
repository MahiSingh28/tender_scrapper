import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Calculator, 
  Building2, 
  Coins, 
  Clock, 
  Zap, 
  ChevronRight,
  RefreshCw,
  Award,
  Layers,
  Scale
} from 'lucide-react';
import { TenderItem, TenderAiAnalysis } from '../types/tender';
import { analyzeTenderWithAi, askTenderAiQuestion } from '../services/api';

interface AiTenderIntelligenceProps {
  tenders: TenderItem[];
  onSelectTender: (tender: TenderItem) => void;
}

export const AiTenderIntelligence: React.FC<AiTenderIntelligenceProps> = ({ tenders, onSelectTender }) => {
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenders[0]?.tenderId || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<TenderAiAnalysis | null>(tenders[0]?.aiAnalysis || null);
  const [analysisSource, setAnalysisSource] = useState<string>('');

  // Q&A State
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Namaste! I am your AI Tender Bid Strategist using the Tender Intelligence Engine. Ask me any question regarding technical eligibility, EMD exemptions, GePNIC reverse auctions, or GFR 2017 compliance.',
      time: '12:00 PM'
    }
  ]);

  const activeTender = tenders.find(t => t.tenderId === selectedTenderId) || tenders[0];

  // Keep the selected tender in sync when the database changes after the
  // component has mounted (for example, after a live scraper run).
  useEffect(() => {
    if (tenders.length === 0) {
      setSelectedTenderId('');
      setActiveAnalysis(null);
      return;
    }

    const selectedStillExists = tenders.some(t => t.tenderId === selectedTenderId);
    const nextTender = selectedStillExists
      ? tenders.find(t => t.tenderId === selectedTenderId)
      : tenders[0];

    if (nextTender) {
      setSelectedTenderId(nextTender.tenderId);
      setActiveAnalysis(nextTender.aiAnalysis || null);
    }
  }, [tenders, selectedTenderId]);

  const handleRunAnalysis = async () => {
    if (!activeTender) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeTenderWithAi(activeTender);
      if (res) {
        setActiveAnalysis(res);
        setAnalysisSource('tender-intelligence-engine');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskQuestion = async (textToSend?: string) => {
    const q = textToSend || question;
    if (!q.trim() || !activeTender || isAsking) return;

    const userMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatHistory(prev => [...prev, userMsg]);
    setQuestion('');
    setIsAsking(true);

    try {
      const answer = await askTenderAiQuestion(activeTender, q);
      const aiMsg = { sender: 'ai' as const, text: answer, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg = { sender: 'ai' as const, text: 'Unable to connect to AI engine. Please verify backend service.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const quickPrompts = [
    'Can MSME vendors claim EMD exemption under GFR 170?',
    'What is the estimated technical turnover threshold for this budget?',
    'What are the key disqualification risks in BoQ submission?',
    'How should the Bank Guarantee for performance security be structured?'
  ];

  return (
    <div className="space-y-6">
      {/* Hero AI Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-500/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Tender Intelligence • Government Procurement
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              AI Tender Intelligence & Bid Risk Copilot
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Real-time deep analysis of Indian government e-procurement RFPs. Automatically audits commercial viability, 
              reverse-engineers eligibility thresholds, flags hidden operational risks, and advises on win strategy.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-xs space-y-1.5 shrink-0">
            <div className="text-slate-300 font-semibold uppercase tracking-wider text-[10px]">Active AI Engine</div>
            <div className="text-emerald-400 font-bold text-sm">Local Tender Intelligence Engine</div>
            <div className="text-slate-400">Structured Schema • GFR 2017 Grounded</div>
          </div>
        </div>
      </div>

      {/* Tender Selector & Analysis Trigger Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
              Select Target Tender for AI Assessment:
            </label>
            <select
              value={selectedTenderId}
              onChange={(e) => {
                setSelectedTenderId(e.target.value);
                const found = tenders.find(t => t.tenderId === e.target.value);
                setActiveAnalysis(found?.aiAnalysis || null);
              }}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {tenders.length > 0 ? (
                tenders.map((t) => (
                  <option key={t.tenderId} value={t.tenderId}>
                    [{t.stateCode}] {t.formattedBudget} • {t.title.slice(0, 85)}...
                  </option>
                ))
              ) : (
                <option value="">No tenders available</option>
              )}
            </select>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-center">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || !activeTender}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Evaluating RFP...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4 text-amber-300" />
                  <span>Run AI Bid Evaluation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Left AI Evaluation Report, Right Live Q&A Copilot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Evaluation Report */}
        <div className="lg:col-span-7 space-y-6">
          {!activeTender ? (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No Tender Available</h3>
                <p className="text-xs text-slate-500">
                  The Tender Intelligence workspace is ready. Run the live scraper and collect at least one real tender to generate an assessment.
                </p>
              </div>
            </div>
          ) : activeAnalysis ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              {/* Score & Recommendation Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-xl font-black text-indigo-700 leading-none">
                      {activeAnalysis.viabilityScore}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">/ 100</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Commercial Viability Score</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        activeAnalysis.bidRecommendation === 'HIGHLY RECOMMENDED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : activeAnalysis.bidRecommendation === 'BID WITH CAUTION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {activeAnalysis.bidRecommendation}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <span>Audited: {activeAnalysis.analyzedAt}</span>
                  {analysisSource && (
                    <span className="block text-[11px] text-indigo-600 font-semibold">Engine: {analysisSource}</span>
                  )}
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Executive AI Summary
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed font-sans">
                  {activeAnalysis.executiveSummary}
                </p>
              </div>

              {/* Operational & Technical Risks */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  Critical Bid Risks & Vulnerabilities ({activeAnalysis.keyRisks.length})
                </h4>
                <div className="space-y-2">
                  {activeAnalysis.keyRisks.map((risk, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/60 border border-rose-200/80 text-xs text-rose-950">
                      <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{risk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility Checklist */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mandatory Eligibility Criteria Checklist
                </h4>
                <div className="space-y-1.5">
                  {activeAnalysis.eligibilityChecklist.map((item, idx) => (
                    <label key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-xs text-slate-800 cursor-pointer">
                      <input type="checkbox" defaultChecked className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600" />
                      <span className="leading-snug">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Strategic Advantages */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  Strategic Competitive Bidding Advantages
                </h4>
                <div className="space-y-1.5">
                  {activeAnalysis.strategicAdvantages.map((adv, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Notes */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Scale className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Procurement Compliance & Exemption Guidance:</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">{activeAnalysis.complianceNotes}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No AI Assessment Generated Yet</h3>
                <p className="text-xs text-slate-500">
                  Click the <strong>"Run AI Bid Evaluation"</strong> button above to invoke Tender Intelligence Flash for commercial viability scoring, risk evaluation, and eligibility checklists.
                </p>
              </div>
              <button
                onClick={handleRunAnalysis}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Evaluate Tender Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Tender Q&A Copilot */}
        <div className="lg:col-span-5 flex flex-col h-[700px] bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                <BrainCircuit className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold leading-tight">Tender RFP AI Consultant</h4>
                <span className="text-[10px] text-emerald-400 font-mono">
                  ● {activeTender ? `Context Active: ${activeTender.tenderId}` : 'Waiting for a tender'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Questions Pills */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto flex gap-1.5 scrollbar-thin">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(qp)}
                disabled={!activeTender || isAsking}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs bg-slate-100/60 scrollbar-thin">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
            {isAsking && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Reviewing procurement guidelines...</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask about EMD exemption, BoQ items, turnover..."
              value={question}
              disabled={!activeTender || isAsking}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskQuestion();
              }}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleAskQuestion()}
              disabled={isAsking || !activeTender || !question.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
