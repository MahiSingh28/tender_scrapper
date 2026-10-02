import React, { useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Coins, 
  Building2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Layers 
} from 'lucide-react';
import { TenderItem } from '../types/tender';
import { formatIndianCurrency, calculateDaysLeft } from '../utils/tenderUtils';

interface AnalyticsViewProps {
  tenders: TenderItem[];
  onSelectTender: (tender: TenderItem) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tenders, onSelectTender }) => {
  // Aggregate Stats
  const totalVolume = useMemo(() => {
    return tenders.reduce((acc, t) => acc + t.estimatedBudgetInr, 0);
  }, [tenders]);

  const avgBudget = useMemo(() => {
    return tenders.length > 0 ? totalVolume / tenders.length : 0;
  }, [totalVolume, tenders]);

  // State Breakdown
  const stateStats = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    tenders.forEach(t => {
      const existing = map.get(t.state) || { count: 0, volume: 0 };
      map.set(t.state, {
        count: existing.count + 1,
        volume: existing.volume + t.estimatedBudgetInr
      });
    });
    return Array.from(map.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.volume - a.volume);
  }, [tenders]);

  // Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; volume: number }>();
    tenders.forEach(t => {
      const existing = map.get(t.category) || { count: 0, volume: 0 };
      map.set(t.category, {
        count: existing.count + 1,
        volume: existing.volume + t.estimatedBudgetInr
      });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.volume - a.volume);
  }, [tenders]);

  // Urgent tenders (closing in <= 7 days)
  const urgentTenders = useMemo(() => {
    return tenders
      .filter(t => {
        const days = calculateDaysLeft(t.bidSubmissionEndDate).days;
        return days <= 7 && days >= 0;
      })
      .sort((a, b) => new Date(a.bidSubmissionEndDate).getTime() - new Date(b.bidSubmissionEndDate).getTime());
  }, [tenders]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Compiled Value</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatIndianCurrency(totalVolume)}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">
            Across {tenders.length} parsed state records
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Average Tender Size</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {formatIndianCurrency(avgBudget)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            Normalized INR value
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">States & UTs Covered</span>
            <MapPin className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {stateStats.length} Jurisdictions
          </div>
          <span className="text-[11px] text-slate-400 block mt-1">
            GePNIC & NextGen eProc
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Closing Within 7 Days</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {urgentTenders.length} Tenders
          </div>
          <span className="text-[11px] text-amber-700/80 font-medium block mt-1">
            Immediate action required
          </span>
        </div>
      </div>

      {/* State & Sector Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State Ranking by Budget Volume */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              State-wise Budget Allocation (Top Volume)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Ranked by INR</span>
          </div>

          <div className="space-y-3">
            {stateStats.slice(0, 7).map((item) => {
              const percentage = totalVolume > 0 ? (item.volume / totalVolume) * 100 : 0;
              return (
                <div key={item.state} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.state} ({item.count} tenders)</span>
                    <span className="font-mono font-bold text-emerald-700">{formatIndianCurrency(item.volume)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sector / Category Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-600" />
              Sector & Category Distribution
            </h3>
            <span className="text-xs text-slate-400 font-medium">Share of Total</span>
          </div>

          <div className="space-y-3">
            {categoryStats.map((cat) => {
              const percentage = totalVolume > 0 ? (cat.volume / totalVolume) * 100 : 0;
              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat.category}</span>
                    <span className="text-slate-500 font-mono">
                      {formatIndianCurrency(cat.volume)} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Urgent Bids Alert Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Expiring Soonest: Urgent Bids (Closing in ≤ 7 Days)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Requires prompt submission</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Tender ID & Title</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Budget</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {urgentTenders.map(t => {
                const days = calculateDaysLeft(t.bidSubmissionEndDate).days;
                return (
                  <tr 
                    key={t.id}
                    onClick={() => onSelectTender(t)}
                    className="hover:bg-rose-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 max-w-sm">
                      <div className="font-mono font-bold text-slate-800 text-[11px]">{t.tenderId}</div>
                      <div className="truncate text-slate-700 mt-0.5">{t.title}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-indigo-700">{t.state}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-emerald-700">
                      {t.formattedBudget}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                      <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                        {days} Days Left ({t.bidSubmissionEndDate})
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button className="text-indigo-600 font-semibold hover:underline">
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
