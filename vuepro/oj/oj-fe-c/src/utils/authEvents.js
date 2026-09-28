const authExpiredListeners = new Set()

export function onAuthExpired(listener) {
  authExpiredListeners.add(listener)
  return () => authExpiredListeners.delete(listener)
}

export function notifyAuthExpired() {
  authExpiredListeners.forEach((listener) => listener())
}
