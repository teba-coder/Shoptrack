export const PAYMENTS = [
  {
    value: 'cash',
    label: 'Cash',
    short: 'Cash',
    pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  {
    value: 'card',
    label: 'Card',
    short: 'Card',
    pill: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
  {
    value: 'mobile',
    label: 'Mobile money',
    short: 'Mobile',
    pill: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
]

export const paymentMeta = (value) => PAYMENTS.find((p) => p.value === value) || PAYMENTS[0]

export const stockStatus = (product) => {
  if (!product) return 'in'
  if (product.stock <= 0) return 'out'
  if (product.stock <= product.lowStockLevel) return 'low'
  return 'in'
}

export const STATUS = {
  in: { label: 'In stock', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  low: { label: 'Low stock', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  out: { label: 'Out of stock', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' },
}

export const stockMeta = (product) => STATUS[stockStatus(product)]

export const CHART = {
  light: { series: '#4f46e5', grid: '#e2e8f0', ink: '#64748b', axis: '#334155', cursor: '#94a3b8' },
  dark: { series: '#818cf8', grid: '#1e293b', ink: '#94a3b8', axis: '#cbd5e1', cursor: '#64748b' },
}
