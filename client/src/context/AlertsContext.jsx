import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api'

const AlertsContext = createContext(null)
export const useAlerts = () => useContext(AlertsContext)

// Low-stock data shared by the sidebar badge, the notification bell and the pages.
// Mounted inside Layout, so it only runs while a user is logged in.
export function AlertsProvider({ children }) {
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    api('/products/low-stock')
      .then((data) => { setItems(data.items); setCount(data.count) })
      .catch(() => { /* badge is optional, never block the page */ })
  }, [])

  useEffect(() => {
    refresh()
    // Coming back to the tab can mean stock changed on another device
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return <AlertsContext.Provider value={{ items, count, refresh }}>{children}</AlertsContext.Provider>
}
