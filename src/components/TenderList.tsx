import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  ArrowUpDown, 
  Calendar, 
  Building2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileJson, 
  Layers, 
  ChevronRight, 
  Eye, 
  BellRing,
  Star,
  Sparkles,
  Bookmark
} from 'lucide-react';
import { TenderItem } from '../types/tender';
import { calculateDaysLeft, formatIndianCurrency } from '../utils/tenderUtils';

interface TenderListProps {
  tenders: TenderItem[];
  onSelectTender: (tender: TenderItem, initialTab?: 'details' | 'ai' | 'qa') => void;
  onExportCsv: (items: TenderItem[]) => void;
  onExportJson: (items: TenderItem[]) => void;
  onToggleBookmark?: (tenderId: string) => void;
}

export const TenderList: React.FC<TenderListProps> = ({
  tenders,
  onSelectTender,
  onExportCsv,
  onExportJson,
  onToggleBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [minBudget, setMinBudget] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'budget_desc' | 'budget_asc' | 'date_soonest' | 'date_newest'>('budget_desc');
  const [onlyAlertMatches, setOnlyAlertMatches] = useState<boolean>(false);
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);

  // Total alert matches
  const totalAlertMatches = useMemo(() => {
    return tenders.filter(t => t.matchedAlerts && t.matchedAlerts.length > 0).length;
  }, [tenders]);

  // Total bookmarked
  const totalBookmarked = useMemo(() => {
    return tenders.filter(t => t.isBookmarked).length;
  }, [tenders]);

  // Unique lists for filters
  const stateOptions = useMemo(() => {
    const set = new Set(tenders.map(t => t.state));
    return Array.from(set).sort();
  }, [tenders]);

  const categoryOptions = useMemo(() => {
    const set = new Set(tenders.map(t => t.category));
    return Array.from(set).sort();
  }, [tenders]);

  // Filtered & sorted tenders
  const filteredTenders = useMemo(() => {
    return tenders.filter((item) => {
      // Bookmark filter
      if (onlyBookmarked && !item.isBookmarked) {
        return false;
      }

      // Alert match filter
      if (onlyAlertMatches && (!item.matchedAlerts || item.matchedAlerts.length === 0)) {
        return false;
      }

      // Search
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesId = item.tenderId.toLowerCase().includes(query);
        const matchesOrg = item.organization.toLowerCase().includes(query);
        const matchesDept = item.department.toLowerCase().includes(query);
        const matchesLoc = item.location.toLowerCase().includes(query);
        if (!matchesTitle && !matchesId && !matchesOrg && !matchesDept && !matchesLoc) {
          return false;
        }
      }

      // State filter
      if (selectedState !== 'ALL' && item.state !== selectedState) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Budget filter
      if (minBudget > 0 && item.estimatedBudgetInr < minBudget) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'budget_desc') {
        return b.estimatedBudgetInr - a.estimatedBudgetInr;
      } else if (sortBy === 'budget_asc') {
        return a.estimatedBudgetInr - b.estimatedBudgetInr;
      } else if (sortBy === 'date_soonest') {
        return new Date(a.bidSubmissionEndDate).getTime() - new Date(b.bidSubmissionEndDate).getTime();
      } else {
        return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
      }
    });
  }, [tenders, searchQuery, selectedState, selectedCategory, minBudget, sortBy, onlyAlertMatches, onlyBookmarked]);

  // Total budget of filtered
  const totalFilteredBudget = useMemo(() => {
    return filteredTenders.reduce((sum, item) => sum + item.estimatedBudgetInr, 0);
  }, [filteredTenders]);

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tender title, GePNIC ID, department, city or work scope..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportCsv(filteredTenders)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV ({filteredTenders.length})</span>
            </button>
            <button
              onClick={() => onExportJson(filteredTenders)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5 text-sky-600" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* State */}
          <div>
            <label className="text-slate-500 font-semibold block mb-1">State / UT:</label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All States ({tenders.length})</option>
              {stateOptions.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-slate-500 font-semibold block mb-1">Category / Sector:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Min Budget */}
          <div>
            <label className="text-slate-500 font-semibold block mb-1">Min Budget Value:</label>
            <select
              value={minBudget}
              onChange={(e) => setMinBudget(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={0}>Any Budget (All)</option>
              <option value={10000000}>₹1.00 Cr and above</option>
              <option value={50000000}>₹5.00 Cr and above</option>
              <option value={200000000}>₹20.00 Cr and above</option>
              <option value={500000000}>₹50.00 Cr and above</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="text-slate-500 font-semibold block mb-1">Sort Results By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="budget_desc">Highest Budget Value</option>
              <option value="budget_asc">Lowest Budget Value</option>
              <option value="date_soonest">Closing Soonest (Urgent)</option>
              <option value="date_newest">Newly Published</option>
            </select>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* Bookmarks Filter Pill */}
            <button
              onClick={() => setOnlyBookmarked(!onlyBookmarked)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                onlyBookmarked
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyBookmarked ? 'fill-white text-white' : 'text-amber-500'}`} />
              <span>Bookmarked Tenders ({totalBookmarked})</span>
            </button>

            {/* Alert Filter Pill */}
            <button
              onClick={() => setOnlyAlertMatches(!onlyAlertMatches)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                onlyAlertMatches
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BellRing className={`w-3.5 h-3.5 ${onlyAlertMatches ? 'text-white' : 'text-indigo-600'}`} />
              <span>Keyword Alert Matches ({totalAlertMatches})</span>
            </button>
          </div>

          {(onlyAlertMatches || onlyBookmarked || searchQuery || selectedState !== 'ALL' || selectedCategory !== 'ALL' || minBudget > 0) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedState('ALL');
                setSelectedCategory('ALL');
                setMinBudget(0);
                setOnlyAlertMatches(false);
                setOnlyBookmarked(false);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat */}
      <div className="flex flex-wrap items-center justify-between text-xs px-2 text-slate-600">
        <div>
          Showing <strong>{filteredTenders.length}</strong> compiled tenders 
          {selectedState !== 'ALL' && <span> in <strong>{selectedState}</strong></span>}
          {selectedCategory !== 'ALL' && <span> for <strong>{selectedCategory}</strong></span>}
          {onlyBookmarked && <span className="text-amber-600 font-bold"> (Bookmarked Only)</span>}
        </div>
        <div>
          Filtered Total Value: <strong className="font-mono text-emerald-700">{formatIndianCurrency(totalFilteredBudget)}</strong>
        </div>
      </div>

      {/* Tender Cards / Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 w-10 text-center">Save</th>
                <th className="py-3 px-4">Tender Details & Title</th>
                <th className="py-3 px-4">State & Dept</th>
                <th className="py-3 px-4">Estimated Budget</th>
                <th className="py-3 px-4">Due Date / Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTenders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No tenders match your current filter criteria. Try resetting the filters.
                  </td>
                </tr>
              ) : (
                filteredTenders.map((item) => {
                  const daysInfo = calculateDaysLeft(item.bidSubmissionEndDate);
                  const hasAlerts = item.matchedAlerts && item.matchedAlerts.length > 0;

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => onSelectTender(item)}
                      className={`transition-colors cursor-pointer group ${
                        item.isBookmarked
                          ? 'bg-amber-50/30'
                          : hasAlerts
                          ? 'bg-indigo-50/30 border-l-4 border-l-indigo-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Bookmark Icon */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onToggleBookmark?.(item.tenderId)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-500 transition-colors"
                          title={item.isBookmarked ? 'Remove Bookmark' : 'Bookmark Tender'}
                        >
                          <Star 
                            className={`w-4 h-4 transition-all ${
                              item.isBookmarked 
                                ? 'fill-amber-400 text-amber-500 scale-110' 
                                : 'text-slate-300 hover:text-amber-400'
                            }`} 
                          />
                        </button>
                      </td>

                      {/* Title & Tender ID */}
                      <td className="py-3 px-4 max-w-md">
                        {hasAlerts && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            {item.matchedAlerts?.map((kw) => (
                              <span 
                                key={kw} 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                              >
                                <BellRing className="w-3 h-3 text-amber-600 animate-pulse" />
                                <span>ALERT MATCH: "{kw.toUpperCase()}"</span>
                              </span>
                            ))}
                          </div>
                        )}
                        <h4 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.tenderId}
                          </span>
                          <span>•</span>
                          <span>Ref: {item.tenderReferenceNumber}</span>
                        </div>
                      </td>

                      {/* State & Organization */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                          {item.state}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5" title={item.organization}>
                          {item.organization}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {item.category}
                        </div>
                      </td>

                      {/* Estimated Budget */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-emerald-700 font-bold text-sm">
                          {item.formattedBudget}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          EMD: ₹{item.emdAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Due Date & Countdown */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-800 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {item.bidSubmissionEndDate}
                        </div>
                        <div className="mt-1">
                          {daysInfo.isUrgent ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" />
                              {daysInfo.days} days left (Urgent)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {daysInfo.days} days left
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTender(item, 'ai');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold text-[11px] transition-colors cursor-pointer border border-indigo-200"
                            title="Run Tender Intelligence Flash Tender Risk Evaluation"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>AI Insights</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTender(item, 'details');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                          <a
                            href={item.detailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Direct FrontEndTender Portal Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
