import { useSyncExternalStore } from "react"

const MOBILE_QUERY = "(width < 48rem)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function getIsMobile() {
  return window.matchMedia(MOBILE_QUERY).matches
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getIsMobile, () => false)
}
