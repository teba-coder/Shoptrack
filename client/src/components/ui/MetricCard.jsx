const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
}

export default function MetricCard({ icon: Icon, label, value, note, tone = 'indigo', badge }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone]}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        {badge}
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
      {note && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</div>}
    </div>
  )
}
