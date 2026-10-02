import React from 'react';
import { BellRing, X, ArrowRight, Eye, Tag } from 'lucide-react';
import { TenderAlertNotification, TenderItem } from '../types/tender';

interface AlertToastProps {
  notification: TenderAlertNotification | null;
  onDismiss: () => void;
  onInspect: (tender: TenderItem) => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({
  notification,
  onDismiss,
  onInspect,
}) => {
  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-amber-500/80 flex flex-col gap-2.5 backdrop-blur-md">
        {/* Top line */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500/20 text-amber-400">
              <BellRing className="w-4 h-4 animate-bounce" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-400" />
              Tender Alert: "{notification.matchedKeyword}"
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div>
          <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-relaxed">
            {notification.tenderTitle}
          </h4>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
            <span className="font-semibold text-indigo-300">{notification.state}</span>
            <span>•</span>
            <span className="font-mono font-bold text-emerald-400">{notification.budgetFormatted}</span>
            <span>•</span>
            <span>{notification.timestamp}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {notification.tenderId}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onInspect(notification.tenderItem);
                onDismiss();
              }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Inspect Tender</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
