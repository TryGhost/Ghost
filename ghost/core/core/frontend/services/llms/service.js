const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

const DEFAULT_BUDGET = 5 * 1024 * 1024;
const TRUNCATION_FOOTER = '\n_Truncated after 5 MiB. Use `/llms.txt` for the complete index of older public content._\n';
const FULL_PAGE_SIZE = 100;

function createLlmsService({settingsCache, labs, config, urlServiceFacade, urlUtils, models, routing, api, fullTxtBudget}) {
    const BUDGET = (fullTxtBudget || DEFAULT_BUDGET) - Buffer.byteLength(TRUNCATION_FOOTER, 'utf8');
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

        const pageResult = await appendBoundedSectionPaginated(output, 'Pages', 'page');
        output = pageResult.output;
        wasTruncated = pageResult.wasTruncated;

        if (!wasTruncated) {
            const postResult = await appendBoundedSectionPaginated(output, 'Posts', 'post');
            output = postResult.output;
            wasTruncated = postResult.wasTruncated;
        }

        if (wasTruncated) {
            output += TRUNCATION_FOOTER;
        }

        return output.trimEnd() + '\n';
    }

    async function appendBoundedSectionPaginated(prefix, heading, type) {
        const headingBlock = `${prefix}## ${heading}\n`;

        if (Buffer.byteLength(headingBlock, 'utf8') > BUDGET) {
            return {output: prefix, wasTruncated: true};
        }

        let output = headingBlock;
        let wasTruncated = false;
        let page = 1;
        let hasMore = true;

        while (hasMore && !wasTruncated) {
            const result = await fetchFullEntries(type, page);
            const entries = result.entries;
            hasMore = result.hasMore;

            if (!entries.length && page === 1) {
                const emptySection = `${output}_No public content available._\n`;

                if (Buffer.byteLength(emptySection, 'utf8') <= BUDGET) {
                    output = emptySection;
                } else {
                    wasTruncated = true;
                }

                break;
            }

            for (const entry of entries) {
                const formattedEntry = buildFullEntry(entry);
                const candidate = `${output}${formattedEntry}\n`;

                if (Buffer.byteLength(candidate, 'utf8') > BUDGET) {
                    wasTruncated = true;
                    break;
                }

                output = candidate;
            }

            page += 1;
        }

        return {output, wasTruncated};
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

    function resolveEntryUrl(entry) {
        const url = urlServiceFacade.getUrlForResource(
            {...entry, type: entry.type, id: entry.id},
            {absolute: true}
        );
        return url && !url.endsWith('/404/') ? url : null;
    }

    async function fetchIndexEntries(type) {
        const page = await models.Post.findPage({
            limit: 'all',
            order: type === 'post' ? 'published_at desc' : 'id asc',
            filter: `status:published+visibility:public+type:${type}`,
            columns: ['id', 'title', 'slug', 'custom_excerpt', 'plaintext', 'published_at', 'type'],
            withRelated: ['tags', 'authors']
        });

        const entries = page.data.map((model) => {
            const entry = model.toJSON();
            entry.url = resolveEntryUrl(entry);
            return entry;
        }).filter(entry => entry.url);

        if (type === 'page') {
            entries.sort((left, right) => left.url.localeCompare(right.url));
        }

        return entries;
    }

    async function fetchFullEntries(type, pageNum) {
        const result = await models.Post.findPage({
            limit: FULL_PAGE_SIZE,
            page: pageNum,
            order: type === 'post' ? 'published_at desc' : 'id asc',
            filter: `status:published+visibility:public+type:${type}`,
            columns: ['id', 'title', 'slug', 'html', 'plaintext', 'custom_excerpt', 'updated_at', 'published_at', 'created_at', 'type'],
            withRelated: ['tags', 'authors']
        });

        const entries = result.data.map((model) => {
            const entry = model.toJSON();
            entry.url = resolveEntryUrl(entry);
            return entry;
        }).filter(entry => entry.url);

        const hasMore = result.data.length === FULL_PAGE_SIZE;

        return {entries, hasMore};
    }

    return {isEnabled, getLlmsTxt, getLlmsFullTxt, fetchPublicEntry};
}

module.exports = {createLlmsService};
