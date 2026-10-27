import { getHelpArticleSlug } from './help-article-html';

/*
 * Turns DocsBot's answers, which are Markdown, into HTML for the thread. It
 * covers what the answers use: paragraphs, headings, bold and italic, inline
 * code and code blocks, links, and bulleted and numbered lists. The result is
 * still made safe by prepareArticleHtml (help-article-html.ts) before it's
 * rendered, which also marks links to help articles to open in the panel, so
 * nothing here needs to be the last line of defence.
 *
 * PROTOTYPE: a small renderer rather than a dependency, as Admin has none for
 * Markdown. Swap in a library if the answers outgrow it.
 */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Bold, italic, code spans and links within a line (already escaped). */
export function renderInline(text: string) {
  // Code spans first, so nothing inside them is formatted. Their placeholder
  // uses characters escapeHtml has already removed from the text.
  const codes: string[] = [];
  let html = text.replace(/`([^`]+)`/g, (_, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `<<${codes.length - 1}>>`;
  });
  html = html
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label: string, url: string) => `<a href="${url}">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  return html.replace(/<<(\d+)>>/g, (_, index: string) => codes[Number(index)] ?? '');
}

const LIST_ITEM = /^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s*```/;

/** Markdown to HTML. */
export function renderMarkdown(markdown: string) {
  const lines = escapeHtml(markdown.replace(/\r\n/g, '\n')).split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  let fence: string[] | null = null;

  const closeParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(
        `<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join('')}</${list.tag}>`,
      );
      list = null;
    }
  };

  for (const line of lines) {
    if (fence) {
      if (FENCE.test(line)) {
        out.push(`<pre><code>${fence.join('\n')}</code></pre>`);
        fence = null;
      } else {
        fence.push(line);
      }
      continue;
    }
    if (FENCE.test(line)) {
      closeParagraph();
      closeList();
      fence = [];
      continue;
    }
    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      closeParagraph();
      closeList();
      // Answers are short, so their headings sit below the panel's own
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item && item[3] !== undefined) {
      closeParagraph();
      const tag = item[1] ? 'ul' : 'ol';
      if (!list || list.tag !== tag) {
        closeList();
        list = { tag, items: [] };
      }
      list.items.push(renderInline(item[3]));
      continue;
    }
    if (list && /^\s{2,}/.test(line)) {
      // An indented line continues the item above it
      list.items[list.items.length - 1] += ` ${renderInline(line.trim())}`;
      continue;
    }
    closeList();
    paragraph.push(line.trim());
  }
  if (fence) {
    out.push(`<pre><code>${fence.join('\n')}</code></pre>`);
  }
  closeParagraph();
  closeList();
  return out.join('');
}

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/**
 * Takes the links to help center articles out of an answer, to show as source
 * cards instead of twice. A line that's nothing but such links goes; a link
 * inside a sentence becomes its text.
 */
export function extractHelpLinks(markdown: string): { markdown: string; urls: string[] } {
  const urls: string[] = [];
  const lines = markdown.split('\n').flatMap((line) => {
    let found = false;
    const unlinked = line.replace(LINK, (match, label: string, url: string) => {
      if (!getHelpArticleSlug(url)) {
        return match;
      }
      found = true;
      if (!urls.includes(url)) {
        urls.push(url);
      }
      return label;
    });
    if (!found) {
      return [line];
    }
    // Only the links' text left (plus list markers or punctuation): drop the line
    const withoutLinks = line.replace(LINK, (match, _label, url: string) =>
      getHelpArticleSlug(url) ? '' : match,
    );
    return /[a-z0-9]/i.test(withoutLinks) ? [unlinked] : [];
  });
  return {
    markdown: lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    urls,
  };
}

/** Cuts a link that's still arriving off the end of streaming text, so it doesn't show half-made. */
export function trimOpenLink(markdown: string) {
  return markdown.replace(/\[[^\]]*(\]\([^)]*)?$/, '');
}
