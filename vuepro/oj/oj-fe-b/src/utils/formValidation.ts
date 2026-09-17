import type {
  FieldValidationRule,
  FormValue,
  ProblemFieldMetadata,
  ProblemFormErrors,
  ProblemFormValues,
} from '@/types/problem'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(?:\+?86[- ]?)?1[3-9]\d{9}$/

const isEmpty = (value: FormValue | undefined): boolean =>
  value == null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0)

const formatIsValid = (value: string, format: FieldValidationRule['format']): boolean => {
  if (format === 'email') return EMAIL_PATTERN.test(value)
  if (format === 'phone') return PHONE_PATTERN.test(value)
  if (format === 'url') {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }
  return true
}

/**
 * Validate one value against server-supplied field rules.
 * @param value Current field value.
 * @param field Field metadata and validation rules.
 * @returns The first user-facing error, or an empty string when valid.
 */
export function validateFieldValue(
  value: FormValue | undefined,
  field: ProblemFieldMetadata,
): string {
  for (const rule of field.validation ?? []) {
    if (rule.required && isEmpty(value)) return rule.message || `${field.label}不能为空`
    if (isEmpty(value)) continue

    const length = Array.isArray(value) ? value.length : String(value).length
    if (rule.minLength != null && length < rule.minLength) {
      return rule.message || `${field.label}至少需要 ${rule.minLength} 个字符`
    }
    if (rule.maxLength != null && length > rule.maxLength) {
      return rule.message || `${field.label}不能超过 ${rule.maxLength} 个字符`
    }

    const numeric = typeof value === 'number' ? value : Number(value)
    if (rule.min != null && (Number.isNaN(numeric) || numeric < rule.min)) {
      return rule.message || `${field.label}不能小于 ${rule.min}`
    }
    if (rule.max != null && (Number.isNaN(numeric) || numeric > rule.max)) {
      return rule.message || `${field.label}不能大于 ${rule.max}`
    }

    if (rule.format && !formatIsValid(String(value), rule.format)) {
      const labels = { email: '邮箱', url: 'URL', phone: '手机号' }
      return rule.message || `请输入有效的${labels[rule.format]}`
    }

    if (rule.pattern) {
      try {
        if (!new RegExp(rule.pattern).test(String(value))) {
          return rule.message || `${field.label}格式不正确`
        }
      } catch {
        return `${field.label}的验证规则配置无效`
      }
    }
  }
  return ''
}

/** Validate all configured fields and return a name-to-message map. */
export function validateProblemValues(
  values: ProblemFormValues,
  fields: ProblemFieldMetadata[],
): ProblemFormErrors {
  return fields.reduce<ProblemFormErrors>((errors, field) => {
    const error = validateFieldValue(values[field.name], field)
    if (error) errors[field.name] = error
    return errors
  }, {})
}
