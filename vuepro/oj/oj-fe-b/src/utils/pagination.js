export const PAGE_SIZE_OPTIONS = Object.freeze([10, 20, 50, 100])
export const PAGE_SIZE_MIN = 1
export const PAGE_SIZE_MAX = 500

const createPageSizeError = (message) => {
  const error = new Error(message)
  error.code = 'INVALID_PAGE_SIZE'
  return error
}

/** 校验并归一化用户输入的每页条数。 */
export function normalizePageSize(
  value,
  { min = PAGE_SIZE_MIN, max = PAGE_SIZE_MAX } = {},
) {
  const text = typeof value === 'string' ? value.trim() : value
  if (text === '' || text == null) {
    throw createPageSizeError(`请输入 ${min}-${max} 之间的每页条数`)
  }

  const isNumericText = typeof text !== 'string' || /^[+-]?\d+(?:\.\d+)?$/.test(text)
  const number = isNumericText ? Number(text) : Number.NaN
  if (!Number.isInteger(number)) {
    throw createPageSizeError('每页条数必须是整数')
  }
  if (number < min || number > max) {
    throw createPageSizeError(`每页条数必须在 ${min}-${max} 之间`)
  }
  return number
}
