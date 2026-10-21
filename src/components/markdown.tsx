import React, { ReactNode } from 'react'

/** Parse inline markdown: bold, italic, strikethrough, inline code, and links. */
export function parseInline(text: string): ReactNode {
  if (!text) return null

  // Tokenize regex for inline elements:
  // 1: **bold**
  // 2: __bold__
  // 3: ~~strikethrough~~
  // 4: *italic*
  // 5: _italic_
  // 6: `code`
  // 7: [text](url)
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g
  const tokens = text.split(pattern)

  if (tokens.length === 1) {
    return text
  }

  return tokens.map((part, index) => {
    if (!part) return null

    // Bold **...** or __...__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-semibold text-inherit">
          {parseInline(part.slice(2, -2))}
        </strong>
      )
    }

    // Strikethrough ~~...~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
      return (
        <del key={index} className="line-through opacity-80">
          {parseInline(part.slice(2, -2))}
        </del>
      )
    }

    // Italic *...* or _..._
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic text-inherit">
          {parseInline(part.slice(1, -1))}
        </em>
      )
    }

    // Inline code `...`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded bg-black/10 dark:bg-white/15 px-1.5 py-0.5 font-mono text-[12px] font-medium"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Links [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium hover:opacity-80 transition-opacity"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return part
  })
}

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  if (!content) return null

  const lines = content.split('\n')
  const elements: ReactNode[] = []
  let currentList: { type: 'ul' | 'ol'; items: ReactNode[] } | null = null
  let inCodeBlock = false
  let codeBlockLines: string[] = []

  function flushList() {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 ml-5 list-disc space-y-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        )
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 ml-5 list-decimal space-y-1">
            {currentList.items.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ol>
        )
      }
      currentList = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()

    // Handle code blocks ```
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${elements.length}`}
            className="my-2 overflow-x-auto rounded-lg bg-black/10 dark:bg-white/10 p-3 font-mono text-[12px] leading-relaxed"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        flushList()
        inCodeBlock = true
        codeBlockLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine)
      continue
    }

    // Empty line -> flush list and provide spacing between paragraphs
    if (!trimmed) {
      flushList()
      continue
    }

    // Headings
    if (/^###\s+(.+)$/.test(trimmed)) {
      flushList()
      const match = trimmed.match(/^###\s+(.+)$/)
      elements.push(
        <h4 key={`h4-${elements.length}`} className="mt-3 mb-1 text-[14px] font-semibold text-inherit">
          {parseInline(match![1])}
        </h4>
      )
      continue
    }

    if (/^##\s+(.+)$/.test(trimmed)) {
      flushList()
      const match = trimmed.match(/^##\s+(.+)$/)
      elements.push(
        <h3 key={`h3-${elements.length}`} className="mt-3.5 mb-1.5 text-[15px] font-bold text-inherit">
          {parseInline(match![1])}
        </h3>
      )
      continue
    }

    if (/^#\s+(.+)$/.test(trimmed)) {
      flushList()
      const match = trimmed.match(/^#\s+(.+)$/)
      elements.push(
        <h2 key={`h2-${elements.length}`} className="mt-4 mb-2 text-[16px] font-bold text-inherit">
          {parseInline(match![1])}
        </h2>
      )
      continue
    }

    // Blockquote > quote
    if (/^>\s*(.*)$/.test(trimmed)) {
      flushList()
      const match = trimmed.match(/^>\s*(.*)$/)
      elements.push(
        <blockquote
          key={`quote-${elements.length}`}
          className="my-2 border-l-2 border-current/40 pl-3 italic opacity-90"
        >
          {parseInline(match![1])}
        </blockquote>
      )
      continue
    }

    // Bullet list: - item or * item
    if (/^[-*]\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^[-*]\s+(.+)$/)
      if (!currentList || currentList.type !== 'ul') {
        flushList()
        currentList = { type: 'ul', items: [] }
      }
      currentList.items.push(parseInline(match![1]))
      continue
    }

    // Numbered list: 1. item
    if (/^\d+\.\s+(.+)$/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s+(.+)$/)
      if (!currentList || currentList.type !== 'ol') {
        flushList()
        currentList = { type: 'ol', items: [] }
      }
      currentList.items.push(parseInline(match![1]))
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={`p-${elements.length}`} className="leading-relaxed my-2 first:mt-0 last:mb-0">
        {parseInline(rawLine)}
      </p>
    )
  }

  // Flush any lingering list or code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key={`code-${elements.length}`}
        className="my-2 overflow-x-auto rounded-lg bg-black/10 dark:bg-white/10 p-3 font-mono text-[12px] leading-relaxed"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    )
  }
  flushList()

  return <div className={`space-y-1.5 ${className}`}>{elements}</div>
}
