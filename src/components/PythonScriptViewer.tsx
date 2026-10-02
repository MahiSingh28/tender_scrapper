import React, { useState } from 'react';
import { 
  Code2, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  FileText, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { COMPLETE_PYTHON_SCRAPER_SCRIPT, PYTHON_REQUIREMENTS_TXT } from '../data/pythonScriptCode';

export const PythonScriptViewer: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReqs, setCopiedReqs] = useState(false);
  const [activeFile, setActiveFile] = useState<'script' | 'requirements'>('script');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(COMPLETE_PYTHON_SCRAPER_SCRIPT);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyReqs = () => {
    navigator.clipboard.writeText(PYTHON_REQUIREMENTS_TXT);
    setCopiedReqs(true);
    setTimeout(() => setCopiedReqs(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Code2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Live Multi-State Python Scraper
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            A real public-portal scraper using Requests + BeautifulSoup. It keeps a fresh HTTP session while reading the portal's live latest-tender table and only stores records actually returned by the government site. CAPTCHA challenges are not bypassed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownloadFile('live_tender_scraper.py', COMPLETE_PYTHON_SCRAPER_SCRIPT)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py Script</span>
          </button>
          <button
            onClick={() => handleDownloadFile('requirements.txt', PYTHON_REQUIREMENTS_TXT)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>requirements.txt</span>
          </button>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs mb-1">
            <Layers className="w-4 h-4" />
            <span>1. Iframe & Table Traversal</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automatically issues <code>driver.switch_to.frame("PageFrame")</code> or searches nested frames. Filters non-tender rows and extracts <code>FrontEndTender</code> URLs.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
            <Sparkles className="w-4 h-4" />
            <span>2. Session-Safe Detail Fetch</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Keeps the portal's current session cookies and follows the detail URL immediately, avoiding stale session URLs copied from an older browser session.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs mb-1">
            <Terminal className="w-4 h-4" />
            <span>3. Data Export</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Normalizes tender rows and exports the records actually returned by the portal to CSV/XLSX.
          </p>
        </div>
      </div>

      {/* Code Viewer Box */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Sub Header */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveFile('script')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                activeFile === 'script'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>live_tender_scraper.py</span>
            </button>
            <button
              onClick={() => setActiveFile('requirements')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                activeFile === 'requirements'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>requirements.txt</span>
            </button>
          </div>

          <div>
            {activeFile === 'script' ? (
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied Script!' : 'Copy Script'}</span>
              </button>
            ) : (
              <button
                onClick={handleCopyReqs}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
              >
                {copiedReqs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReqs ? 'Copied Reqs!' : 'Copy Requirements'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Code Content */}
        <pre className="p-4 sm:p-6 text-xs font-mono text-slate-300 overflow-x-auto max-h-[600px] leading-relaxed scrollbar-thin">
          {activeFile === 'script' ? COMPLETE_PYTHON_SCRAPER_SCRIPT : PYTHON_REQUIREMENTS_TXT}
        </pre>
      </div>

      {/* Terminal Run Guide */}
      <div className="bg-slate-900 text-slate-200 rounded-xl p-5 border border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          How to Run Locally on Your Machine
        </h4>
        <div className="space-y-2 text-xs font-mono bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-slate-400"># 1. Install required packages (100% offline & local)</div>
          <div className="text-emerald-400">pip install -r requirements.txt</div>
          
          <div className="text-slate-400 pt-2"># 2. Launch the multi-state compiler</div>
          <div className="text-emerald-400">python live_tender_scraper.py</div>
        </div>
      </div>
    </div>
  );
};
