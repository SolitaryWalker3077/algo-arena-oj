import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearQuestionDeleteConfirmationPreference,
  createQuestionDeleteConfirmationSession,
  QUESTION_DELETE_CONFIRMATION_STORAGE_KEY_PREFIX,
  saveQuestionDeleteConfirmationPreference,
  shouldSkipQuestionDeleteConfirmation,
} from '../src/utils/deleteConfirmationPreference'

describe('question delete confirmation preference', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('persists and reads the skip-confirmation preference', () => {
    const sessionId = createQuestionDeleteConfirmationSession()
    expect(shouldSkipQuestionDeleteConfirmation('101', sessionId)).toBe(false)
    expect(saveQuestionDeleteConfirmationPreference('101', sessionId)).toBe(true)
    expect(
      localStorage.getItem(`${QUESTION_DELETE_CONFIRMATION_STORAGE_KEY_PREFIX}:101:${sessionId}`),
    ).toBe('true')
    expect(shouldSkipQuestionDeleteConfirmation('101', sessionId)).toBe(true)
    expect(shouldSkipQuestionDeleteConfirmation('102', sessionId)).toBe(false)
    expect(shouldSkipQuestionDeleteConfirmation('101', 'another-session')).toBe(false)
    expect(clearQuestionDeleteConfirmationPreference('101', sessionId)).toBe(true)
    expect(shouldSkipQuestionDeleteConfirmation('101', sessionId)).toBe(false)
  })

  it('fails safely when browser storage access is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(shouldSkipQuestionDeleteConfirmation('101', 'session')).toBe(false)
    vi.restoreAllMocks()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(saveQuestionDeleteConfirmationPreference('101', 'session')).toBe(false)
    vi.restoreAllMocks()

    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(clearQuestionDeleteConfirmationPreference('101', 'session')).toBe(false)
  })
})
