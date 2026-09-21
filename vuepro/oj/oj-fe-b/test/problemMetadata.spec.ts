import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROBLEM_FORM_METADATA,
  cloneDefaultProblemMetadata,
} from '../src/config/problemFormMetadata'

describe('problem form metadata contract', () => {
  it('provides an independent local form configuration', () => {
    const metadata = cloneDefaultProblemMetadata()
    expect(metadata).toEqual(DEFAULT_PROBLEM_FORM_METADATA)
    expect(metadata).not.toBe(DEFAULT_PROBLEM_FORM_METADATA)
    expect(metadata.fields).not.toBe(DEFAULT_PROBLEM_FORM_METADATA.fields)
  })

  it('uses the Markdown editor for raw problem content', () => {
    const content = DEFAULT_PROBLEM_FORM_METADATA.fields.find((field) => field.name === 'content')
    expect(content).toMatchObject({
      type: 'markdown',
      colSpan: 2,
      validation: expect.arrayContaining([expect.objectContaining({ required: true })]),
    })
  })
})
