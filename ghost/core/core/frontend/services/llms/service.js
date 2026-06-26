const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

const LLMS_TXT_BUDGET = 50 * 1024;
const LLMS_FULL_TXT_BUDGET = 5 * 1024 * 1024;
const LLMS_FULL_TXT_POST_LIMIT = 500;
const BROWSE_PAGE_SIZE = 100;
const PAGES_LIMIT = 20;

const LLMS_TXT_INTRO = 'Public Ghost content for AI and LLM tooling. Use `/llms-full.txt` for consolidated page and post context.';
const LLMS_FULL_TXT_INTRO = 'Public Ghost content for AI and LLM tooling. This file includes a bounded export of public pages first, then recent public posts.';
const MARKDOWN_DISCOVERABILITY = 'Append `.md` to any post or page URL to get the content in Markdown (for example, `/example-post.md`).';
const MEMBERS_ONLY_NOTICE = 'This post is for subscribers only.';
const PAID_MEMBERS_ONLY_NOTICE = 'This post is for paying subscribers only.';
const EMPTY_SECTION = '_No public content available._';
const LLMS_FULL_TXT_TRUNCATION_FOOTER = '\n_Truncated after 5 MiB. Use `/sitemap.xml` for the complete archive of public content._\n';
const LLMS_FULL_TXT_RECENT_POSTS_FOOTER = '\n_Includes the latest 500 public posts. Use `/sitemap.xml` for the complete archive of public content._\n';

// Narrow field lists stop the content API selecting every column (e.g. the full
// html of every post). The requested `formats` columns are appended to the
// select by the input serializer, and `url` is resolved at serialization time.
const LLMS_TXT_FIELDS = 'id,title,slug,custom_excerpt,featured,published_at,url';
const LLMS_FULL_TXT_FIELDS = 'id,title,slug,featured,published_at,updated_at,created_at,url,visibility,custom_excerpt';

function createLlmsService({settingsCache, labs, config, urlUtils, routing, api, fullTxtBudget}) {
    const footerBudget = Math.max(
        Buffer.byteLength(LLMS_FULL_TXT_TRUNCATION_FOOTER, 'utf8'),
        Buffer.byteLength(LLMS_FULL_TXT_RECENT_POSTS_FOOTER, 'utf8')
    );
    const BUDGET = (fullTxtBudget || LLMS_FULL_TXT_BUDGET) - footerBudget;

    function isEnabled() {
        return labs.isSet('llmsTxt') && !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
    }

    async function fetchPublicEntry(resourceType, id, member = null) {
        const controller = resourceType === 'pages' ? api.pagesPublic : api.postsPublic;
        const responseKey = resourceType === 'pages' ? 'pages' : 'posts';
        const response = await controller.read({
            id,
            formats: 'html',
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
            LLMS_TXT_INTRO,
            MARKDOWN_DISCOVERABILITY,
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
        const postsBudget = Math.max(0, LLMS_TXT_BUDGET - fixedBytes);
        const postsSection = await buildBudgetedIndexPosts(postsBudget);

        return `${scaffold(postsSection).join('\n').trim()}\n`;
    }

    async function getLlmsFullTxt() {
        if (!isEnabled()) {
            return null;
        }

        const header = [
            buildHeader(),
            LLMS_FULL_TXT_INTRO,
            MARKDOWN_DISCOVERABILITY,
            ''
        ].join('\n');

        let output = header;
        let wasTruncated = false;
        let wasLimited = false;

        const pageResult = await appendBoundedSectionPaginated(output, 'Pages', 'page', {maxEntries: PAGES_LIMIT});
        output = pageResult.output;
        wasTruncated = pageResult.wasTruncated;

        if (!wasTruncated) {
            const postResult = await appendBoundedSectionPaginated(output, 'Posts', 'post', {maxEntries: LLMS_FULL_TXT_POST_LIMIT});
            output = postResult.output;
            wasTruncated = postResult.wasTruncated;
            wasLimited = postResult.wasLimited;
        }

        if (wasTruncated) {
            output += LLMS_FULL_TXT_TRUNCATION_FOOTER;
        } else if (wasLimited) {
            output += LLMS_FULL_TXT_RECENT_POSTS_FOOTER;
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
                const emptySection = `${output}${EMPTY_SECTION}\n`;
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
            return EMPTY_SECTION;
        }

        return entries.map(buildIndexLine).join('\n');
    }

    async function buildBudgetedIndexPosts(budgetBytes) {
        const lines = [];
        let usedBytes = 0;
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const {entries, pagination} = await browsePublishedEntries('post', {
                limit: BROWSE_PAGE_SIZE,
                page,
                fields: LLMS_TXT_FIELDS,
                formats: 'plaintext'
            });
            hasMore = Boolean(pagination && pagination.next);

            for (const entry of entries) {
                const line = buildIndexLine(entry);
                const lineBytes = Buffer.byteLength(`${line}\n`, 'utf8');

                if (usedBytes + lineBytes > budgetBytes) {
                    return lines.length ? lines.join('\n') : EMPTY_SECTION;
                }

                lines.push(line);
                usedBytes += lineBytes;
            }

            page += 1;
        }

        return lines.length ? lines.join('\n') : EMPTY_SECTION;
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

    function buildMembersOnlyBody(entry) {
        const notice = (entry.visibility === 'paid' || entry.visibility === 'tiers')
            ? PAID_MEMBERS_ONLY_NOTICE
            : MEMBERS_ONLY_NOTICE;
        const excerpt = truncateDescription(entry.custom_excerpt);

        return excerpt ? `${excerpt}\n\n_${notice}_` : `_${notice}_`;
    }

    function buildFullEntry(entry) {
        const lastUpdated = entry.updated_at || entry.published_at || entry.created_at;
        const lastUpdatedLine = lastUpdated ? `Last updated: ${new Date(lastUpdated).toISOString()}` : null;
        const isMembersOnly = entry.visibility && entry.visibility !== 'public';
        const markdownBody = isMembersOnly
            ? buildMembersOnlyBody(entry)
            : (renderEntryMarkdownBody(entry) || '_No content available._');

        return [
            `### ${entry.title}`,
            `URL: ${entry.url}`,
            lastUpdatedLine,
            '',
            markdownBody
        ].filter(Boolean).join('\n');
    }

    async function browsePublishedEntries(type, options) {
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
        const {entries} = await browsePublishedEntries('page', {
            limit: PAGES_LIMIT,
            fields: LLMS_TXT_FIELDS,
            formats: 'plaintext'
        });

        entries.sort((left, right) => left.url.localeCompare(right.url));

        return entries;
    }

    async function fetchFullEntries(type, pageNum) {
        const {entries, pagination} = await browsePublishedEntries(type, {
            limit: BROWSE_PAGE_SIZE,
            page: pageNum,
            fields: LLMS_FULL_TXT_FIELDS,
            formats: 'html'
        });

        return {entries, hasMore: Boolean(pagination && pagination.next)};
    }

    return {isEnabled, getLlmsTxt, getLlmsFullTxt, fetchPublicEntry};
}

module.exports = {createLlmsService};
