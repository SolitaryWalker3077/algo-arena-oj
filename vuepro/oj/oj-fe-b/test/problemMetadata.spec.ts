import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PROBLEM_FORM_METADATA } from '../src/config/problemFormMetadata'

describe('problem form metadata contract', () => {
  it('keeps the frontend fallback identical to the backend JSON document', () => {
    const resourcePath = resolve(
      process.cwd(),
      '../../../alog-arena-oj/oj-modules/oj-system/src/main/resources/question-form-metadata.json',
    )
    const serverMetadata = JSON.parse(readFileSync(resourcePath, 'utf8'))
    expect(serverMetadata).toEqual(DEFAULT_PROBLEM_FORM_METADATA)
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
