import type { ProblemFormValues } from '@/types/problem'

const DRAFT_PREFIX = 'oj-problem-draft:'

interface StoredDraft {
  version: string
  savedAt: string
  values: ProblemFormValues
}

const storageKey = (id = 'new'): string => `${DRAFT_PREFIX}${id || 'new'}`

/** Save a form snapshot without allowing storage restrictions to break editing. */
export function saveProblemDraft(
  values: ProblemFormValues,
  version: string,
  id?: string,
): string | null {
  const savedAt = new Date().toISOString()
  try {
    localStorage.setItem(storageKey(id), JSON.stringify({ version, savedAt, values }))
    return savedAt
  } catch {
    return null
  }
}

/** Load only drafts matching the active metadata schema version. */
export function loadProblemDraft(version: string, id?: string): StoredDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDraft
    if (parsed.version !== version || !parsed.values || typeof parsed.values !== 'object')
      return null
    return parsed
  } catch {
    return null
  }
}

/** Remove a draft after a successful submit or explicit discard. */
export function clearProblemDraft(id?: string): void {
  try {
    localStorage.removeItem(storageKey(id))
  } catch {
    // Storage can be blocked by browser policy; there is nothing else to clean up.
  }
}
