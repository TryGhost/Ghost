const { NodeHtmlMarkdown } = require('node-html-markdown');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const MAX_DESCRIPTION_LENGTH = 300;

const nhm = new NodeHtmlMarkdown({
  bulletMarker: '-',
  codeFence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
});

function collapseWhitespace(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncateDescription(value, maxLength = MAX_DESCRIPTION_LENGTH) {
  const collapsed = collapseWhitespace(value);

  if (!collapsed || collapsed.length <= maxLength) {
    return collapsed;
  }

  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

function getMarkdownPath(pathname) {
  if (!pathname || pathname === '/') {
    return '/index.md';
  }

  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return `${normalizedPath}.md`;
}

function getMarkdownUrl(url) {
  const parsedUrl = new URL(url);
  parsedUrl.pathname = getMarkdownPath(parsedUrl.pathname);
  return parsedUrl.toString();
}

function getResourcePathFromMarkdownPath(pathname) {
  if (!pathname || !pathname.endsWith('.md')) {
    return null;
  }

  const stripped = pathname.slice(0, -3);

  if (!stripped || stripped === '/index') {
    return '/';
  }

  return stripped.endsWith('/') ? stripped : `${stripped}/`;
}

function markdownFromHtml(html) {
  const markdown = nhm.translate(html || '').trim();

  if (!markdown) {
    return null;
  }

  return markdown.replace(/\n{3,}/g, '\n\n');
}

function formatIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getPrimaryAuthorName(entry) {
  if (entry.primary_author?.name) {
    return entry.primary_author.name;
  }

  if (Array.isArray(entry.authors) && entry.authors[0]?.name) {
    return entry.authors[0].name;
  }

  return null;
}

function getTagNames(entry) {
  if (Array.isArray(entry.tags) && entry.tags.length) {
    return entry.tags.map((t) => t.name).filter(Boolean);
  }

  if (entry.primary_tag?.name) {
    return [entry.primary_tag.name];
  }

  return [];
}

function renderEntryMarkdownBody(entry) {
  const markdown = markdownFromHtml(entry.html);

  if (markdown) {
    return markdown;
  }

  return collapseWhitespace(htmlToPlaintext.excerpt(entry.html || ''));
}

/**
 * Visibility-appropriate notice matching content-cta.hbs wording.
 * For gated entries the notice carries the meaning — never emit
 * "_No content available._" when this is used.
 *
 * `resourceKind` must be passed by callers that know it: the content API
 * does not serialize `type`, so `entry.type` is undefined for both posts
 * and pages.
 */
function getGatedNotice(entry, resourceKind) {
  const resource = (resourceKind || entry.type) === 'page' ? 'page' : 'post';
  const visibility = entry.visibility;

  if (visibility === 'paid') {
    return `This ${resource} is for paying subscribers only.`;
  }

  if (visibility === 'tiers') {
    const tierNames = (Array.isArray(entry.tiers) ? entry.tiers : [])
      .map((tier) => tier?.name)
      .filter(Boolean);

    if (tierNames.length === 1) {
      return `This ${resource} is for subscribers on the ${tierNames[0]} tier only.`;
    }

    if (tierNames.length > 1) {
      const firsts = tierNames.slice(0, -1).join(', ');
      const last = tierNames[tierNames.length - 1];
      return `This ${resource} is for subscribers on the ${firsts} and ${last} tiers only.`;
    }

    return `This ${resource} is for paying subscribers only.`;
  }

  return `This ${resource} is for subscribers only.`;
}

function renderEntryMarkdown(entry, options = {}) {
  const { llmsIndexUrl, notice, cta } = options;
  const tags = getTagNames(entry);
  const metadata = [
    entry.url ? `- URL: ${entry.url}` : null,
    entry.type ? `- Type: ${entry.type}` : null,
    formatIsoDate(entry.published_at) ? `- Published: ${formatIsoDate(entry.published_at)}` : null,
    formatIsoDate(entry.updated_at) ? `- Updated: ${formatIsoDate(entry.updated_at)}` : null,
    collapseWhitespace(entry.custom_excerpt)
      ? `- Description: ${collapseWhitespace(entry.custom_excerpt)}`
      : null,
    getPrimaryAuthorName(entry) ? `- Author: ${getPrimaryAuthorName(entry)}` : null,
    tags.length ? `- Tags: ${tags.join(', ')}` : null,
  ].filter(Boolean);

  // Gated entries render only the paywall preview. custom_excerpt is already
  // carried by the `- Description:` metadata line above, so falling back to it
  // here would just repeat it.
  const isGated = Boolean(notice);
  const body = isGated
    ? renderEntryMarkdownBody(entry) || null
    : renderEntryMarkdownBody(entry) || '_No content available._';

  const lines = [
    '> ## Content Index',
    `> Fetch the complete content index at: ${llmsIndexUrl}`,
    '> Use this file to discover other available public pages before exploring further.',
    '',
    `# ${entry.title || 'Untitled'}`,
  ];

  if (metadata.length) {
    lines.push(...metadata, '');
  } else {
    lines.push('');
  }

  if (body) {
    lines.push(body);
  }

  if (notice) {
    if (body) {
      lines.push('', '---', '');
    }
    lines.push(`_${notice}_`);

    const ctaLines = Array.isArray(cta) ? cta : cta ? [cta] : [];
    for (const line of ctaLines) {
      if (line) {
        lines.push('', line);
      }
    }
  }

  return lines.join('\n');
}

module.exports = {
  MAX_DESCRIPTION_LENGTH,
  collapseWhitespace,
  formatIsoDate,
  getGatedNotice,
  getMarkdownPath,
  getMarkdownUrl,
  getPrimaryAuthorName,
  getTagNames,
  getResourcePathFromMarkdownPath,
  markdownFromHtml,
  renderEntryMarkdown,
  renderEntryMarkdownBody,
  truncateDescription,
};
