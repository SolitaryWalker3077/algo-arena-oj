export type MarkdownEditAction =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'unordered-list'
  | 'ordered-list'
  | 'quote'
  | 'inline-code'
  | 'code-block'
  | 'link'
  | 'image'
  | 'horizontal-rule'

export interface MarkdownEditResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

const wrap = (
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string,
): MarkdownEditResult => {
  const selected = value.slice(start, end) || placeholder
  const replacement = `${before}${selected}${after}`
  const selectionStart = start + before.length
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart,
    selectionEnd: selectionStart + selected.length,
  }
}

const prefixLines = (
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
): MarkdownEditResult => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const nextBreak = value.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const original = value.slice(lineStart, lineEnd) || '列表项'
  const replacement = original
    .split('\n')
    .map((line, index) => `${prefix(index)}${line}`)
    .join('\n')
  return {
    value: `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + replacement.length,
  }
}

/** Apply a toolbar action while preserving a useful selection and undo-friendly textarea update. */
export function applyMarkdownEdit(
  value: string,
  start: number,
  end: number,
  action: MarkdownEditAction,
): MarkdownEditResult {
  switch (action) {
    case 'heading':
      return prefixLines(value, start, end, () => '## ')
    case 'bold':
      return wrap(value, start, end, '**', '**', '加粗文本')
    case 'italic':
      return wrap(value, start, end, '*', '*', '斜体文本')
    case 'unordered-list':
      return prefixLines(value, start, end, () => '- ')
    case 'ordered-list':
      return prefixLines(value, start, end, (index) => `${index + 1}. `)
    case 'quote':
      return prefixLines(value, start, end, () => '> ')
    case 'inline-code':
      return wrap(value, start, end, '`', '`', '代码')
    case 'code-block':
      return wrap(value, start, end, '```java\n', '\n```', '// 代码')
    case 'link':
      return wrap(value, start, end, '[', '](https://example.com)', '链接文字')
    case 'image':
      return wrap(value, start, end, '![', '](https://example.com/image.png)', '图片描述')
    case 'horizontal-rule': {
      const replacement = '\n\n---\n\n'
      return {
        value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
        selectionStart: start + replacement.length,
        selectionEnd: start + replacement.length,
      }
    }
  }
}
