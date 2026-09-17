import { describe, expect, it } from 'vitest'
import { validateFieldValue, validateProblemValues } from '../src/utils/formValidation'
import type { ProblemFieldMetadata } from '../src/types/problem'

const field = (
  validation: ProblemFieldMetadata['validation'],
  name = 'value',
): ProblemFieldMetadata => ({
  name,
  label: '测试字段',
  type: 'text',
  validation,
})

describe('metadata form validation', () => {
  it('treats whitespace-only required text as empty', () => {
    expect(
      validateFieldValue('   ', {
        name: 'title',
        label: '题目标题',
        type: 'text',
        validation: [{ required: true, message: '请输入题目标题' }],
      }),
    ).toBe('请输入题目标题')
  })

  it('validates required and string length rules in order', () => {
    const meta = field([
      { required: true, message: '必填' },
      { minLength: 2, message: '太短' },
      { maxLength: 4, message: '太长' },
    ])
    expect(validateFieldValue('', meta)).toBe('必填')
    expect(validateFieldValue('a', meta)).toBe('太短')
    expect(validateFieldValue('abcde', meta)).toBe('太长')
    expect(validateFieldValue('abc', meta)).toBe('')
  })

  it('treats empty arrays as missing and validates array length', () => {
    const meta = field([{ required: true }, { minLength: 2 }])
    expect(validateFieldValue([], meta)).toContain('不能为空')
    expect(validateFieldValue(['one'], meta)).toContain('至少需要')
    expect(validateFieldValue(['one', 'two'], meta)).toBe('')
  })

  it('validates numeric boundaries including invalid numeric input', () => {
    const meta = field([{ min: 10 }, { max: 20 }])
    expect(validateFieldValue(9, meta)).toContain('不能小于')
    expect(validateFieldValue('not-a-number', meta)).toContain('不能小于')
    expect(validateFieldValue(21, meta)).toContain('不能大于')
    expect(validateFieldValue(15, meta)).toBe('')
  })

  it.each([
    ['email', 'admin@example.com', 'admin@invalid'],
    ['url', 'https://example.com/path', 'ftp://example.com'],
    ['phone', '13800138000', '10086'],
  ] as const)('supports %s format rules', (format, valid, invalid) => {
    const meta = field([{ format }])
    expect(validateFieldValue(valid, meta)).toBe('')
    expect(validateFieldValue(invalid, meta)).not.toBe('')
  })

  it('supports custom regular expressions and reports malformed metadata', () => {
    expect(validateFieldValue('OJ-42', field([{ pattern: '^OJ-\\d+$' }]))).toBe('')
    expect(validateFieldValue('bad', field([{ pattern: '^OJ-\\d+$', message: '编号错误' }]))).toBe(
      '编号错误',
    )
    expect(validateFieldValue('x', field([{ pattern: '[' }]))).toContain('配置无效')
  })

  it('returns a stable error map for the complete form', () => {
    const fields = [
      field([{ required: true, message: '标题必填' }], 'title'),
      field([{ maxLength: 3, message: '代码过长' }], 'code'),
    ]
    expect(validateProblemValues({ title: '', code: '1234' }, fields)).toEqual({
      title: '标题必填',
      code: '代码过长',
    })
    expect(validateProblemValues({ title: '题目', code: '123' }, fields)).toEqual({})
  })
})
