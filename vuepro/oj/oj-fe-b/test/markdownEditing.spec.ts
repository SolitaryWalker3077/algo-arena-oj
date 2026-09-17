import { describe, expect, it } from 'vitest'
import { applyMarkdownEdit, type MarkdownEditAction } from '../src/utils/markdownEditing'

describe('Markdown toolbar edits', () => {
  it.each([
    ['bold', '**文本**'],
    ['italic', '*文本*'],
    ['inline-code', '`文本`'],
    ['link', '[文本](https://example.com)'],
    ['image', '![文本](https://example.com/image.png)'],
  ] as Array<[MarkdownEditAction, string]>)('wraps a selection for %s', (action, expected) => {
    const result = applyMarkdownEdit('文本', 0, 2, action)
    expect(result.value).toBe(expected)
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('文本')
  })

  it.each([
    ['heading', '## 第一行\n## 第二行'],
    ['unordered-list', '- 第一行\n- 第二行'],
    ['ordered-list', '1. 第一行\n2. 第二行'],
    ['quote', '> 第一行\n> 第二行'],
  ] as Array<[MarkdownEditAction, string]>)(
    'prefixes selected lines for %s',
    (action, expected) => {
      expect(applyMarkdownEdit('第一行\n第二行', 0, 7, action).value).toBe(expected)
    },
  )

  it('inserts a fenced code block with a useful placeholder', () => {
    const result = applyMarkdownEdit('', 0, 0, 'code-block')
    expect(result.value).toBe('```java\n// 代码\n```')
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('// 代码')
  })

  it('inserts a horizontal rule at the cursor', () => {
    const result = applyMarkdownEdit('前后', 1, 1, 'horizontal-rule')
    expect(result.value).toBe('前\n\n---\n\n后')
    expect(result.selectionStart).toBe(result.selectionEnd)
  })

  it('uses placeholders when there is no selected text', () => {
    expect(applyMarkdownEdit('', 0, 0, 'bold').value).toBe('**加粗文本**')
    expect(applyMarkdownEdit('', 0, 0, 'unordered-list').value).toBe('- 列表项')
  })
})
