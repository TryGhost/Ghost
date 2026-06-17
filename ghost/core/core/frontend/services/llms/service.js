const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

const DEFAULT_BUDGET = 5 * 1024 * 1024;
const DEFAULT_INDEX_BUDGET = 50 * 1024;
const TRUNCATION_FOOTER = '\n_Truncated after 5 MiB. Use `/sitemap.xml` for the complete archive of public content._\n';
const RECENT_POSTS_FOOTER = '\n_Includes the latest 500 public posts. Use `/sitemap.xml` for the complete archive of public content._\n';
const FULL_PAGE_SIZE = 100;
const FULL_POST_LIMIT = 500;
const PAGES_LIMIT = 20;

function createLlmsService({settingsCache, labs, config, urlUtils, routing, api, fullTxtBudget}) {
    const footerBudget = Math.max(
        Buffer.byteLength(TRUNCATION_FOOTER, 'utf8'),
        Buffer.byteLength(RECENT_POSTS_FOOTER, 'utf8')
    );
    const BUDGET = (fullTxtBudget || DEFAULT_BUDGET) - footerBudget;

    function isEnabled() {
        return labs.isSet('llmsTxt') && !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
    }

    async function fetchPublicEntry(resourceType, id, member = null) {
        const controller = resourceType === 'pages' ? api.pagesPublic : api.postsPublic;
        const responseKey = resourceType === 'pages' ? 'pages' : 'posts';
        const response = await controller.read({
            id,
            formats: 'html,plaintext',
            include: 'authors,tags',
            context: {member}
        });

        return response?.[responseKey]?.[0] || null;
    }

    async function getLlmsTxt() {
        if (!isEnabled()) {
            return null;
        }

        const pages = await fetchIndexPages();
        const pagesSection = buildIndexSection(pages);
        const optionalSection = buildOptionalSection();

        const scaffold = postsSection => [
            buildHeader(),
            'Public Ghost content for AI and LLM tooling. Use `/llms-full.txt` for consolidated page and post context.',
            'Append `.md` to any post or page URL to get the content in Markdown (for example, `/example-post.md`).',
            '',
            '## Pages',
            pagesSection,
            '',
            '## Posts',
            postsSection,
            '',
            '## Optional',
            optionalSection
        ];

        const fixedBytes = Buffer.byteLength(scaffold('').join('\n'), 'utf8');
        const postsBudget = Math.max(0, DEFAULT_INDEX_BUDGET - fixedBytes);
        const postsSection = await buildBudgetedIndexPosts(postsBudget);

        return `${scaffold(postsSection).join('\n').trim()}\n`;
    }

    async function getLlmsFullTxt() {
        if (!isEnabled()) {
            return null;
        }

        const header = [
            buildHeader(),
            'Public Ghost content for AI and LLM tooling. This file includes a bounded export of public pages first, then recent public posts.',
            'Append `.md` to any post or page URL to get the content in Markdown (for example, `/example-post.md`).',
            ''
        ].join('\n');

        let output = header;
        let wasTruncated = false;
        let wasLimited = false;

        const pageResult = await appendBoundedSectionPaginated(output, 'Pages', 'page', {maxEntries: PAGES_LIMIT});
        output = pageResult.output;
        wasTruncated = pageResult.wasTruncated;

        if (!wasTruncated) {
            const postResult = await appendBoundedSectionPaginated(output, 'Posts', 'post', {maxEntries: FULL_POST_LIMIT});
            output = postResult.output;
            wasTruncated = postResult.wasTruncated;
            wasLimited = postResult.wasLimited;
        }

        if (wasTruncated) {
            output += TRUNCATION_FOOTER;
        } else if (wasLimited) {
            output += RECENT_POSTS_FOOTER;
        }

        return output.trimEnd() + '\n';
    }

    async function appendBoundedSectionPaginated(prefix, heading, type, {maxEntries = null} = {}) {
        const headingBlock = `${prefix}## ${heading}\n`;

        if (Buffer.byteLength(headingBlock, 'utf8') > BUDGET) {
            return {output: prefix, wasTruncated: true, wasLimited: false};
        }

        let output = headingBlock;
        let outputBytes = Buffer.byteLength(output, 'utf8');
        let wasTruncated = false;
        let wasLimited = false;
        let page = 1;
        let hasMore = true;
        let entriesRendered = 0;

        while (hasMore && !wasTruncated && !wasLimited) {
            const result = await fetchFullEntries(type, page);
            const entries = result.entries;
            hasMore = result.hasMore;

            if (!entries.length && page === 1) {
                const emptySection = `${output}_No public content available._\n`;
                const emptySectionBytes = Buffer.byteLength(emptySection, 'utf8');

                if (emptySectionBytes <= BUDGET) {
                    output = emptySection;
                    outputBytes = emptySectionBytes;
                } else {
                    wasTruncated = true;
                }

                break;
            }

            for (const entry of entries) {
                if (maxEntries && entriesRendered >= maxEntries) {
                    wasLimited = true;
                    break;
                }

                const formattedEntry = buildFullEntry(entry);
                const entryBlock = `${formattedEntry}\n`;
                const entryBytes = Buffer.byteLength(entryBlock, 'utf8');

                if (outputBytes + entryBytes > BUDGET) {
                    wasTruncated = true;
                    break;
                }

                output = `${output}${entryBlock}`;
                outputBytes += entryBytes;
                entriesRendered += 1;
            }

            if (maxEntries && entriesRendered >= maxEntries && hasMore) {
                wasLimited = true;
            }

            page += 1;
        }

        return {output, wasTruncated, wasLimited};
    }

    function buildHeader() {
        const siteTitle = settingsCache.get('title') || new URL(config.get('url')).hostname;
        const siteDescription = settingsCache.get('meta_description') || settingsCache.get('description');

        return [
            `# ${siteTitle}`,
            siteDescription ? `> ${siteDescription}` : '> Public Ghost publication content.'
        ].join('\n');
    }

    function buildIndexLine(entry) {
        const description = truncateDescription(entry.custom_excerpt || entry.plaintext);
        const linkLine = `- [${entry.title}](${getMarkdownUrl(entry.url)})`;

        if (!description) {
            return linkLine;
        }

        return `${linkLine} - ${description}`;
    }

    function buildIndexSection(entries) {
        if (!entries.length) {
            return '_No public content available._';
        }

        return entries.map(buildIndexLine).join('\n');
    }

    async function buildBudgetedIndexPosts(budgetBytes) {
        const lines = [];
        let usedBytes = 0;
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const {entries, pagination} = await browsePublicEntries('post', {
                limit: FULL_PAGE_SIZE,
                page,
                fields: 'id,title,slug,custom_excerpt,featured,published_at,url',
                formats: 'plaintext'
            });
            hasMore = Boolean(pagination && pagination.next);

            for (const entry of entries) {
                const line = buildIndexLine(entry);
                const lineBytes = Buffer.byteLength(`${line}\n`, 'utf8');

                if (usedBytes + lineBytes > budgetBytes) {
                    return lines.length ? lines.join('\n') : '_No public content available._';
                }

                lines.push(line);
                usedBytes += lineBytes;
            }

            page += 1;
        }

        return lines.length ? lines.join('\n') : '_No public content available._';
    }

    function buildOptionalSection() {
        const optionalLinks = [];
        const rssUrl = routing.registry.getRssUrl({absolute: true});

        if (rssUrl) {
            optionalLinks.push(`- [RSS Feed](${rssUrl})`);
        }

        optionalLinks.push(`- [Sitemap](${urlUtils.urlFor({relativeUrl: '/sitemap.xml'}, true)})`);
        optionalLinks.push(`- [Full content of pages and posts](${urlUtils.urlFor({relativeUrl: '/llms-full.txt'}, true)})`);

        return optionalLinks.join('\n');
    }

    function buildFullEntry(entry) {
        const lastUpdated = entry.updated_at || entry.published_at || entry.created_at;
        const lastUpdatedLine = lastUpdated ? `Last updated: ${new Date(lastUpdated).toISOString()}` : null;

        let markdownBody;
        if (entry.visibility && entry.visibility !== 'public') {
            const notice = (entry.visibility === 'paid' || entry.visibility === 'tiers')
                ? 'This post is for paying subscribers only.'
                : 'This post is for subscribers only.';
            const excerpt = truncateDescription(entry.custom_excerpt);
            markdownBody = excerpt ? `${excerpt}\n\n_${notice}_` : `_${notice}_`;
        } else {
            markdownBody = renderEntryMarkdownBody(entry) || '_No content available._';
        }

        return [
            `### ${entry.title}`,
            `URL: ${entry.url}`,
            lastUpdatedLine,
            '',
            markdownBody
        ].filter(Boolean).join('\n');
    }

    async function browsePublicEntries(type, options) {
        const controller = type === 'page' ? api.pagesPublic : api.postsPublic;
        const responseKey = type === 'page' ? 'pages' : 'posts';

        const response = await controller.browse({
            ...options,
            context: {member: null},
            filter: 'status:published',
            ...(type === 'page' ? {order: 'id asc'} : {})
        });

        const entries = (response?.[responseKey] || [])
            .filter(entry => entry.url && !entry.url.endsWith('/404/'));

        return {entries, pagination: response?.meta?.pagination};
    }

    async function fetchIndexPages() {
        // Without `fields` the content API selects every posts column (except
        // mobiledoc/lexical), pulling the full html of every post into memory.
        // The format columns (plaintext here) are appended to `fields` by the
        // input serializer, and `url` is resolved at serialization time.
        const {entries} = await browsePublicEntries('page', {
            limit: PAGES_LIMIT,
            fields: 'id,title,slug,custom_excerpt,featured,published_at,url',
            formats: 'plaintext'
        });

        entries.sort((left, right) => left.url.localeCompare(right.url));

        return entries;
    }

    async function fetchFullEntries(type, pageNum) {
        const {entries, pagination} = await browsePublicEntries(type, {
            limit: FULL_PAGE_SIZE,
            page: pageNum,
            fields: 'id,title,slug,featured,published_at,updated_at,created_at,url,visibility,custom_excerpt',
            formats: 'html,plaintext'
        });

        return {entries, hasMore: Boolean(pagination && pagination.next)};
    }

    return {isEnabled, getLlmsTxt, getLlmsFullTxt, fetchPublicEntry};
}

module.exports = {createLlmsService};
