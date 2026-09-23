const STORAGE_KEY_PREFIX = 'contestQuestionDeleteSkipConfirmation'

const getStorageKey = (contestId, sessionId) =>
  `${STORAGE_KEY_PREFIX}:${String(contestId)}:${String(sessionId)}`

export const createQuestionDeleteConfirmationSession = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/**
 * Storage can be disabled by privacy settings or browser policies. In that case
 * deletion remains available and safely falls back to showing the confirmation.
 */
export const shouldSkipQuestionDeleteConfirmation = (contestId, sessionId) => {
  try {
    return window.localStorage.getItem(getStorageKey(contestId, sessionId)) === 'true'
  } catch {
    return false
  }
}

export const saveQuestionDeleteConfirmationPreference = (contestId, sessionId) => {
  try {
    window.localStorage.setItem(getStorageKey(contestId, sessionId), 'true')
    return true
  } catch {
    return false
  }
}

export const clearQuestionDeleteConfirmationPreference = (contestId, sessionId) => {
  try {
    window.localStorage.removeItem(getStorageKey(contestId, sessionId))
    return true
  } catch {
    return false
  }
}

export { STORAGE_KEY_PREFIX as QUESTION_DELETE_CONFIRMATION_STORAGE_KEY_PREFIX }
