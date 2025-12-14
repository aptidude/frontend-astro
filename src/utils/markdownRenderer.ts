// Markdown and Math Renderer for Astro
// Consistent with React frontend's MarkdownRenderer component
import { marked } from 'marked';
import katex from 'katex';

/**
 * Render markdown with LaTeX math support
 * Supports both inline math ($...$) and block math ($$...$$)
 * Also handles \(...\) and \[...\] LaTeX delimiters
 */
export function renderMarkdown(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let processed = content;

  // Process block math with $$ delimiters
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      return `<div class="katex-display">${rendered}</div>`;
    } catch (error) {
      console.warn('KaTeX block rendering error:', error);
      return match;
    }
  });

  // Process block math with \[...\] delimiters
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      return `<div class="katex-display">${rendered}</div>`;
    } catch (error) {
      console.warn('KaTeX block rendering error:', error);
      return match;
    }
  });

  // Process inline math with $ delimiters (being careful not to match currency)
  // Match $...$ but not when preceded by \ or when it looks like currency ($123)
  processed = processed.replace(/(?<!\\)\$([^$\n]+?)\$(?!\d)/g, (match, formula) => {
    // Skip if it looks like a currency amount
    if (/^\d+([.,]\d+)?$/.test(formula.trim())) {
      return match;
    }
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return rendered;
    } catch (error) {
      console.warn('KaTeX inline rendering error:', error);
      return match;
    }
  });

  // Process inline math with \(...\) delimiters
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
      return rendered;
    } catch (error) {
      console.warn('KaTeX inline rendering error:', error);
      return match;
    }
  });

  // Configure marked options for consistency with React
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true,    // GitHub Flavored Markdown
  });

  // Custom renderer for better styling
  const renderer = new marked.Renderer();

  // Style links
  renderer.link = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
    const isExternal = href?.startsWith('http');
    const attrs = isExternal 
      ? `target="_blank" rel="noopener noreferrer"` 
      : '';
    return `<a href="${href}" ${attrs}${title ? ` title="${title}"` : ''}>${text}</a>`;
  };

  // Style images
  renderer.image = ({ href, title, text }: { href: string; title?: string | null; text: string }) => {
    return `<img src="${href}" alt="${text || 'Image'}" loading="lazy" style="max-width: 100%; height: auto; border-radius: 0.375rem; margin: 0.5rem 0;"${title ? ` title="${title}"` : ''}>`;
  };

  // Style tables with overflow wrapper
  renderer.table = (token: Parameters<typeof renderer.table>[0]) => {
    const headerRow = token.header.map(cell => `<th>${cell.text}</th>`).join('');
    const bodyRows = token.rows.map(row => 
      `<tr>${row.map(cell => `<td>${cell.text}</td>`).join('')}</tr>`
    ).join('');
    return `<div style="overflow-x: auto; max-width: 100%; margin: 1rem 0;"><table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
  };

  // Style code blocks
  renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
    return `<pre><code class="language-${lang || ''}">${text}</code></pre>`;
  };

  marked.use({ renderer });

  // Render markdown
  try {
    const html = marked.parse(processed);
    return html as string;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    // Fallback to plain text with basic formatting
    return processed
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}

/**
 * Check if content contains math expressions
 */
export function hasMath(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  return /(\$[\s\S]*?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/.test(content);
}

/**
 * Extract plain text from content (for SEO descriptions)
 */
export function extractPlainText(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove math expressions
  let text = content
    .replace(/\$\$[\s\S]*?\$\$/g, '[formula]')
    .replace(/\$[^$\n]+?\$/g, '[formula]')
    .replace(/\\\[[\s\S]*?\\\]/g, '[formula]')
    .replace(/\\\([\s\S]*?\\\)/g, '[formula]');

  // Remove markdown formatting
  text = text
    .replace(/#{1,6}\s/g, '')           // Headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
    .replace(/\*([^*]+)\*/g, '$1')      // Italic
    .replace(/`([^`]+)`/g, '$1')        // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
    .replace(/^\s*[-*+]\s/gm, '')       // List items
    .replace(/^\s*\d+\.\s/gm, '')       // Numbered lists
    .replace(/\n{2,}/g, ' ')            // Multiple newlines
    .replace(/\n/g, ' ')                // Single newlines
    .trim();

  return text;
}
