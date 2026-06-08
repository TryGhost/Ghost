const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

const DEFAULT_BUDGET = 5 * 1024 * 1024;
const TRUNCATION_FOOTER = '\n_Truncated after 5 MiB. Use `/llms.txt` for the complete index of older public content._\n';
const RECENT_POSTS_FOOTER = '\n_Includes the latest 500 public posts. Use `/llms.txt` for the complete index of older public content._\n';
const FULL_PAGE_SIZE = 100;
const FULL_POST_LIMIT = 500;

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

        const [pages, posts] = await Promise.all([
            fetchIndexEntries('page'),
            fetchIndexEntries('post')
        ]);

        const sections = [
            buildHeader(),
            'Public Ghost content for AI and LLM tooling. Use `/llms-full.txt` for consolidated page and post context.',
            '',
            '## Pages',
            buildIndexSection(pages),
            '',
            '## Posts',
            buildIndexSection(posts),
            '',
            '## Optional',
            buildOptionalSection()
        ];

        return `${sections.join('\n').trim()}\n`;
    }

    async function getLlmsFullTxt() {
        if (!isEnabled()) {
            return null;
        }

        const header = [
            buildHeader(),
            'Public Ghost content for AI and LLM tooling. This file includes a bounded export of public pages first, then recent public posts.',
            ''
        ].join('\n');

        let output = header;
        let wasTruncated = false;
        let wasLimited = false;

        const pageResult = await appendBoundedSectionPaginated(output, 'Pages', 'page');
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

    function buildIndexSection(entries) {
        if (!entries.length) {
            return '_No public content available._';
        }

        return entries.map((entry) => {
            const description = truncateDescription(entry.custom_excerpt || entry.plaintext);
            const linkLine = `- [${entry.title}](${getMarkdownUrl(entry.url)})`;

            if (!description) {
                return linkLine;
            }

            return `${linkLine} - ${description}`;
        }).join('\n');
    }

    function buildOptionalSection() {
        const optionalLinks = [];
        const rssUrl = routing.registry.getRssUrl({absolute: true});

        if (rssUrl) {
            optionalLinks.push(`- [RSS Feed](${rssUrl})`);
        }

        optionalLinks.push(`- [Sitemap](${urlUtils.urlFor({relativeUrl: '/sitemap.xml'}, true)})`);

        return optionalLinks.join('\n');
    }

    function buildFullEntry(entry) {
        const lastUpdated = entry.updated_at || entry.published_at || entry.created_at;
        const lastUpdatedLine = lastUpdated ? `Last updated: ${new Date(lastUpdated).toISOString()}` : null;
        const markdownBody = renderEntryMarkdownBody(entry) || '_No content available._';

        return [
            `### ${entry.title}`,
            `URL: ${entry.url}`,
            lastUpdatedLine,
            '',
            markdownBody
        ].filter(Boolean).join('\n');
    }

    // All content fetching goes through the public Posts/Pages API rather than
    // the model layer directly, so the llms service inherits the same caching,
    // permissions, visibility gating and URL resolution as the Content API.
    // The `type:post`/`type:page` filter is enforced by the public endpoints.
    async function browsePublicEntries(type, options) {
        const controller = type === 'page' ? api.pagesPublic : api.postsPublic;
        const responseKey = type === 'page' ? 'pages' : 'posts';

        const response = await controller.browse({
            filter: 'status:published+visibility:public',
            order: type === 'post' ? 'published_at desc' : 'id asc',
            ...options
        });

        const entries = (response?.[responseKey] || [])
            .filter(entry => entry.url && !entry.url.endsWith('/404/'));

        return {entries, pagination: response?.meta?.pagination};
    }

    async function fetchIndexEntries(type) {
        const {entries} = await browsePublicEntries(type, {
            limit: 'all',
            formats: 'plaintext'
        });

        if (type === 'page') {
            entries.sort((left, right) => left.url.localeCompare(right.url));
        }

        return entries;
    }

    async function fetchFullEntries(type, pageNum) {
        const {entries, pagination} = await browsePublicEntries(type, {
            limit: FULL_PAGE_SIZE,
            page: pageNum,
            formats: 'html,plaintext'
        });

        return {entries, hasMore: Boolean(pagination && pagination.next)};
    }

    return {isEnabled, getLlmsTxt, getLlmsFullTxt, fetchPublicEntry};
}

module.exports = {createLlmsService};
