import React, { useState } from 'react';
import { 
  ExternalLink, 
  MapPin, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  ShieldCheck, 
  Cpu,
  Globe2,
  Radio,
  Zap,
  RefreshCw,
  Clock,
  Server
} from 'lucide-react';
import { INDIAN_STATES_PORTALS } from '../data/statesData';
import { StatePortal } from '../types/tender';
import { testGovernmentPortalLive, PortalCheckResult } from '../services/api';

export const StateRegistryView: React.FC = () => {
  const [filterType, setFilterType] = useState<'ALL' | 'state' | 'ut' | 'central'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [probingUrl, setProbingUrl] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<Record<string, PortalCheckResult>>({});

  const filteredPortals = INDIAN_STATES_PORTALS.filter((portal) => {
    if (filterType !== 'ALL' && portal.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return portal.name.toLowerCase().includes(q) || portal.portalUrl.toLowerCase().includes(q) || portal.code.toLowerCase().includes(q);
    }
    return true;
  });

  const handleProbePortal = async (portal: StatePortal) => {
    setProbingUrl(portal.portalUrl);
    try {
      const result = await testGovernmentPortalLive(portal.portalUrl);
      setProbeResults(prev => ({
        ...prev,
        [portal.portalUrl]: result
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setProbingUrl(null);
    }
  };

  const handleTestAllVisible = async () => {
    const topFour = filteredPortals.slice(0, 4);
    for (const p of topFour) {
      setProbingUrl(p.portalUrl);
      const res = await testGovernmentPortalLive(p.portalUrl);
      setProbeResults(prev => ({ ...prev, [p.portalUrl]: res }));
    }
    setProbingUrl(null);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <MapPin className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900">
              All 28 States, 8 Union Territories & Central Procurement Portals (40 Total)
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Verified official e-procurement endpoints, NIC GePNIC version specifications, iframe CSS selectors, 
            and pagination drivers configured for the scraper across every state, UT, and central government department.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'ALL' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All (40 Portals)
          </button>
          <button
            onClick={() => setFilterType('state')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'state' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            28 States
          </button>
          <button
            onClick={() => setFilterType('ut')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'ut' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            8 UTs
          </button>
          <button
            onClick={() => setFilterType('central')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterType === 'central' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Central (CPPP/IREPS)
          </button>
        </div>
      </div>

      {/* Search Input & Live Probe Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter state or UT portal name (e.g., Maharashtra, Delhi, Rajasthan, UP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
          />
        </div>
        <button
          onClick={handleTestAllVisible}
          disabled={probingUrl !== null}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {probingUrl !== null ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>Test Live Portal Latency</span>
        </button>
      </div>

      {/* Portals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPortals.map((portal) => {
          const probe = probeResults[portal.portalUrl];
          const isCurrentlyProbing = probingUrl === portal.portalUrl;

          return (
            <div
              key={portal.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {portal.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    portal.type === 'state' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : portal.type === 'ut' 
                      ? 'bg-amber-50 text-amber-800' 
                      : 'bg-emerald-50 text-emerald-800'
                  }`}>
                    {portal.type === 'state' ? 'State Govt' : portal.type === 'ut' ? 'Union Territory' : 'Central Govt'}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 leading-snug">
                  {portal.name}
                </h4>

                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Portal Engine:</span>
                    <span className="font-medium text-slate-800">{portal.engine}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Iframe Target:</span>
                    <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700">
                      {portal.iframeSelector}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pagination:</span>
                    <span className="font-mono text-[11px] text-slate-700">{portal.loadNextMechanism}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Est. Active Tenders:</span>
                    <span className="font-bold text-emerald-600 font-mono">~{portal.activeTendersEstimate}</span>
                  </div>
                </div>

                {/* Real Live Probe Telemetry Box */}
                {probe && (
                  <div className={`mt-3 p-2.5 rounded-xl border text-[11px] space-y-1 ${
                    probe.reachable 
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                      : 'bg-amber-50/70 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1">
                        <Radio className={`w-3 h-3 ${probe.reachable ? 'text-emerald-600' : 'text-amber-600'}`} />
                        HTTP {probe.status} {probe.statusText}
                      </span>
                      <span className="font-mono">{probe.latencyMs} ms</span>
                    </div>
                    {probe.hasGePNICSignature && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        ✓ GePNIC Servlet Signature Verified
                      </div>
                    )}
                    {probe.isGeoblockedOrProtected && (
                      <div className="text-[10px] text-amber-800">
                        {probe.note}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                <button
                  onClick={() => handleProbePortal(portal)}
                  disabled={isCurrentlyProbing}
                  className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-indigo-600 text-[11px] bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                >
                  {isCurrentlyProbing ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                  ) : (
                    <Radio className="w-3 h-3 text-emerald-500" />
                  )}
                  <span>{isCurrentlyProbing ? 'Probing...' : 'Live Ping'}</span>
                </button>

                <a
                  href={portal.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 text-[11px]"
                >
                  <span>Visit Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
