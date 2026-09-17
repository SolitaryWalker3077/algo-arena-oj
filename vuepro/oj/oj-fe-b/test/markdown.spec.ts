import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../src/utils/markdown'

describe('safe Markdown rendering', () => {
  it('renders standard structure, links, images and tables', () => {
    const result = renderMarkdown(`
# 题目标题

- 条件一
- 条件二

[题目链接](https://example.com)

![示例图](https://example.com/example.png)

| 输入 | 输出 |
| --- | --- |
| 1 | 2 |
`)

    expect(result.error).toBe('')
    expect(result.html).toContain('<h1>题目标题</h1>')
    expect(result.html).toContain('<ul>')
    expect(result.html).toContain('<table>')
    expect(result.html).toContain('target="_blank"')
    expect(result.html).toContain('rel="noopener noreferrer nofollow"')
    expect(result.html).toContain('<img')
  })

  it('adds syntax highlighting to fenced code blocks and recognizes aliases', () => {
    const result = renderMarkdown('```js\nconst answer = 42\n```')
    expect(result.error).toBe('')
    expect(result.html).toContain('class="hljs language-javascript"')
    expect(result.html).toContain('hljs-keyword')
  })

  it('falls back to automatic highlighting for unknown languages', () => {
    const result = renderMarkdown('```unknown\nSELECT * FROM users;\n```')
    expect(result.error).toBe('')
    expect(result.html).toContain('class="hljs language-unknown"')
    expect(result.html).toContain('SELECT')
  })

  it('escapes raw HTML and rejects dangerous link protocols', () => {
    const result = renderMarkdown('<script>alert(1)</script>\n\n[x](javascript:alert(1))')
    expect(result.error).toBe('')
    expect(result.html).not.toContain('<script>')
    expect(result.html).not.toContain('href="javascript:')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('returns an empty result for blank content', () => {
    expect(renderMarkdown('   ')).toEqual({ html: '', error: '' })
  })
})
