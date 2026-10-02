export function formatIndianCurrency(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
  return `₹${num.toLocaleString('en-IN')}`;
}

export function calculateDaysLeft(endDateStr: string): { days: number; isUrgent: boolean; isExpired: boolean } {
  const end = new Date(endDateStr).getTime();
  if (Number.isNaN(end)) return { days: 0, isUrgent: false, isExpired: false };
  const diffDays = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    days: diffDays,
    isUrgent: diffDays <= 5 && diffDays >= 0,
    isExpired: diffDays < 0,
  };
}
