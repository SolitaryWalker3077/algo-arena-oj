import DOMPurify from 'dompurify'
import MarkdownIt, { type MarkdownIt as MarkdownItInstance, type RendererRule } from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'

const languages = {
  bash,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  kotlin,
  python,
  rust,
  sql,
  typescript,
  xml,
}

for (const [name, language] of Object.entries(languages)) {
  hljs.registerLanguage(name, language)
}

const languageAliases: Record<string, string> = {
  c: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  html: 'xml',
  js: 'javascript',
  kt: 'kotlin',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const markdown: MarkdownItInstance = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(source, requestedLanguage): string {
    const language =
      languageAliases[requestedLanguage.toLowerCase()] || requestedLanguage.toLowerCase()
    try {
      const highlighted =
        language && hljs.getLanguage(language)
          ? hljs.highlight(source, { language, ignoreIllegals: true }).value
          : hljs.highlightAuto(source).value
      const languageClass = language ? ` language-${escapeHtml(language)}` : ''
      return `<pre><code class="hljs${languageClass}">${highlighted}</code></pre>`
    } catch {
      return `<pre><code class="hljs">${escapeHtml(source)}</code></pre>`
    }
  },
})

const defaultLinkOpen = markdown.renderer.rules.link_open
const openLinkInNewTab: RendererRule = (tokens, index, options, env, self) => {
  tokens[index].attrSet('target', '_blank')
  tokens[index].attrSet('rel', 'noopener noreferrer nofollow')
  return defaultLinkOpen
    ? defaultLinkOpen(tokens, index, options, env, self)
    : self.renderToken(tokens, index, options)
}
markdown.renderer.rules.link_open = openLinkInNewTab

export interface MarkdownRenderResult {
  html: string
  error: string
}

/**
 * Convert raw Markdown into sanitized HTML suitable for `v-html`.
 * Raw HTML in Markdown is disabled and the rendered result is sanitized again as defense in depth.
 */
export function renderMarkdown(source: string): MarkdownRenderResult {
  if (!source.trim()) return { html: '', error: '' }
  try {
    const rawHtml = markdown.render(source)
    const html = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['style'],
    })
    return { html, error: '' }
  } catch (error) {
    return {
      html: '',
      error: error instanceof Error ? `Markdown 预览失败：${error.message}` : 'Markdown 预览失败',
    }
  }
}
