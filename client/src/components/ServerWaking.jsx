import { useEffect, useState } from 'react'

// Shown when the server is slow to answer (free hosting wakes up from sleep)
export default function ServerWaking() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const onSlow = (event) => setSlow(event.detail)
    window.addEventListener('api:slow', onSlow)
    return () => window.removeEventListener('api:slow', onSlow)
  }, [])
  if (!slow) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
      The server is waking up. This can take up to 30 seconds the first time.
    </div>
  )
}
