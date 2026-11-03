import { useEffect } from 'react'

// Sets the browser tab title, e.g. "Products | ShopTrack"
export default function usePageTitle(title) {
  useEffect(() => { document.title = `${title} | ShopTrack` }, [title])
}
