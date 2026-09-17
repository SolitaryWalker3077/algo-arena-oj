import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearProblemDraft, loadProblemDraft, saveProblemDraft } from '../src/utils/problemDraft'

describe('problem draft persistence', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a versioned add draft', () => {
    const savedAt = saveProblemDraft({ title: '两数之和', difficulty: 1 }, '1.0.0')
    expect(savedAt).toMatch(/^\d{4}-/)
    expect(loadProblemDraft('1.0.0')).toMatchObject({
      version: '1.0.0',
      values: { title: '两数之和', difficulty: 1 },
    })
  })

  it('isolates edit drafts by id and ignores stale schema versions', () => {
    saveProblemDraft({ title: '编辑草稿' }, '2.0.0', '42')
    expect(loadProblemDraft('2.0.0', '41')).toBeNull()
    expect(loadProblemDraft('1.0.0', '42')).toBeNull()
    expect(loadProblemDraft('2.0.0', '42')?.values.title).toBe('编辑草稿')
  })

  it('clears only the requested draft', () => {
    saveProblemDraft({ title: '新增' }, '1')
    saveProblemDraft({ title: '编辑' }, '1', '42')
    clearProblemDraft('42')
    expect(loadProblemDraft('1', '42')).toBeNull()
    expect(loadProblemDraft('1')?.values.title).toBe('新增')
  })

  it('degrades safely when storage is blocked or data is malformed', () => {
    localStorage.setItem('oj-problem-draft:new', '{bad json')
    expect(loadProblemDraft('1')).toBeNull()

    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(saveProblemDraft({ title: 'x' }, '1')).toBeNull()
    setSpy.mockRestore()

    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('blocked')
    })
    expect(() => clearProblemDraft()).not.toThrow()
    removeSpy.mockRestore()
  })
})
