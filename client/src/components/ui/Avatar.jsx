import { initials } from '../../lib/format'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-sm',
}

export default function Avatar({ name = '', size = 'md' }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-semibold text-white ${SIZES[size]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
