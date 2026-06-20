const {NodeHtmlMarkdown} = require('node-html-markdown');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

const MAX_DESCRIPTION_LENGTH = 300;

const nhm = new NodeHtmlMarkdown({
    bulletMarker: '-',
    codeFence: '```',
    emDelimiter: '*',
    strongDelimiter: '**'
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

function getAcceptedMarkdownContentType(req) {
    const acceptHeader = (req.get('Accept') || '').toLowerCase();

    if (!acceptHeader.includes('text/markdown') && !acceptHeader.includes('text/plain')) {
        return null;
    }

    const preferredType = req.accepts(['text/markdown', 'text/plain', 'text/html']);

    if (!preferredType || preferredType === 'text/html') {
        return null;
    }

    return preferredType;
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
        return entry.tags.map(t => t.name).filter(Boolean);
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

    if (entry.plaintext) {
        return collapseWhitespace(entry.plaintext);
    }

    return collapseWhitespace(htmlToPlaintext.excerpt(entry.html || ''));
}

function renderEntryMarkdown(entry, {llmsIndexUrl}) {
    const tags = getTagNames(entry);
    const metadata = [
        entry.url ? `- URL: ${entry.url}` : null,
        entry.type ? `- Type: ${entry.type}` : null,
        formatIsoDate(entry.published_at) ? `- Published: ${formatIsoDate(entry.published_at)}` : null,
        formatIsoDate(entry.updated_at) ? `- Updated: ${formatIsoDate(entry.updated_at)}` : null,
        collapseWhitespace(entry.custom_excerpt) ? `- Description: ${collapseWhitespace(entry.custom_excerpt)}` : null,
        getPrimaryAuthorName(entry) ? `- Author: ${getPrimaryAuthorName(entry)}` : null,
        tags.length ? `- Tags: ${tags.join(', ')}` : null
    ].filter(Boolean);

    const body = renderEntryMarkdownBody(entry) || '_No content available._';
    const lines = [
        '> ## Content Index',
        `> Fetch the complete content index at: ${llmsIndexUrl}`,
        '> Use this file to discover other available public pages before exploring further.',
        '',
        `# ${entry.title || 'Untitled'}`
    ];

    if (metadata.length) {
        lines.push(...metadata, '');
    } else {
        lines.push('');
    }

    lines.push(body);

    return lines.join('\n');
}

module.exports = {
    MAX_DESCRIPTION_LENGTH,
    collapseWhitespace,
    formatIsoDate,
    getAcceptedMarkdownContentType,
    getMarkdownPath,
    getMarkdownUrl,
    getPrimaryAuthorName,
    getTagNames,
    getResourcePathFromMarkdownPath,
    markdownFromHtml,
    renderEntryMarkdown,
    renderEntryMarkdownBody,
    truncateDescription
};
