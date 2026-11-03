import { stockMeta } from '../../lib/constants'

export default function StatusBadge({ product, className = '' }) {
  const meta = stockMeta(product)
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.className} ${className}`}>
      {meta.label}
    </span>
  )
}
