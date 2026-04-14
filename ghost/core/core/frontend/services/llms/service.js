const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../../server/models');
const urlService = require('../../../server/services/url');
const events = require('../../../server/lib/common/events');
const routing = require('../routing');
const {api} = require('../proxy');
const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

const FIVE_MIB = 5 * 1024 * 1024;

class LlmsService {
    constructor({events: eventBus = events, apiService = api} = {}) {
        this.events = eventBus;
        this.api = apiService;
        this.cache = new Map();
        this.invalidate = this.invalidate.bind(this);
        this.handleSettingEdited = this.handleSettingEdited.bind(this);

        this.events.on('site.changed', this.invalidate);
        this.events.on('routers.reset', this.invalidate);
        this.events.on('url.added', this.invalidate);
        this.events.on('url.removed', this.invalidate);
        this.events.on('settings.title.edited', this.invalidate);
        this.events.on('settings.description.edited', this.invalidate);
        this.events.on('settings.meta_description.edited', this.invalidate);
        this.events.on('settings.llms_enabled.edited', this.invalidate);
        this.events.on('settings.edited', this.handleSettingEdited);
    }

    invalidate() {
        this.cache.clear();
    }

    handleSettingEdited(settingModel) {
        const key = settingModel?.get?.('key') || settingModel?.attributes?.key || settingModel?.key;

        if (key === 'url' || key === 'site_url') {
            this.invalidate();
        }
    }

    isEnabled() {
        return !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
    }

    async fetchPublicEntry(resourceType, id, member = null) {
        const controller = resourceType === 'pages' ? this.api.pagesPublic : this.api.postsPublic;
        const responseKey = resourceType === 'pages' ? 'pages' : 'posts';
        const response = await controller.read({
            id,
            formats: 'html,plaintext',
            include: 'authors,tags',
            context: {member}
        });

        return response?.[responseKey]?.[0] || null;
    }

    async getLlmsTxt() {
        return await this.#getOrBuild('llms.txt', () => this.#buildLlmsTxt());
    }

    async getLlmsFullTxt() {
        return await this.#getOrBuild('llms-full.txt', () => this.#buildLlmsFullTxt());
    }

    async #getOrBuild(key, builder) {
        if (!this.isEnabled()) {
            return null;
        }

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        const content = await builder();
        this.cache.set(key, content);
        return content;
    }

    async #buildLlmsTxt() {
        const [pages, posts] = await Promise.all([
            this.#fetchPublicEntries('page'),
            this.#fetchPublicEntries('post')
        ]);

        const sections = [
            this.#buildHeader(),
            'Public Ghost content for AI and LLM tooling. Use `/llms-full.txt` for consolidated page and post context.',
            '',
            '## Pages',
            this.#buildIndexSection(pages),
            '',
            '## Posts',
            this.#buildIndexSection(posts),
            '',
            '## Optional',
            this.#buildOptionalSection()
        ];

        return `${sections.join('\n').trim()}\n`;
    }

    async #buildLlmsFullTxt() {
        const [pages, posts] = await Promise.all([
            this.#fetchPublicEntries('page'),
            this.#fetchPublicEntries('post')
        ]);

        const header = [
            this.#buildHeader(),
            'Public Ghost content for AI and LLM tooling. This file includes a bounded export of public pages first, then recent public posts.',
            ''
        ].join('\n');

        let output = header;
        let wasTruncated = false;

        const pageSection = this.#appendBoundedSection(output, 'Pages', pages, entry => this.#buildFullEntry(entry));
        output = pageSection.output;
        wasTruncated = pageSection.wasTruncated;

        if (!wasTruncated) {
            const postSection = this.#appendBoundedSection(output, 'Posts', posts, entry => this.#buildFullEntry(entry));
            output = postSection.output;
            wasTruncated = postSection.wasTruncated;
        }

        if (wasTruncated) {
            output += '\n_Truncated after 5 MiB. Use `/llms.txt` for the complete index of older public content._\n';
        }

        return output.trimEnd() + '\n';
    }

    #appendBoundedSection(prefix, heading, entries, formatter) {
        const headingBlock = `${prefix}## ${heading}\n`;

        if (Buffer.byteLength(headingBlock, 'utf8') > FIVE_MIB) {
            return {output: prefix, wasTruncated: true};
        }

        let output = headingBlock;
        let wasTruncated = false;

        if (!entries.length) {
            const emptySection = `${output}_No public content available._\n`;

            if (Buffer.byteLength(emptySection, 'utf8') <= FIVE_MIB) {
                output = emptySection;
            } else {
                wasTruncated = true;
            }

            return {output, wasTruncated};
        }

        for (const entry of entries) {
            const formattedEntry = formatter(entry);
            const candidate = `${output}${formattedEntry}\n`;

            if (Buffer.byteLength(candidate, 'utf8') > FIVE_MIB) {
                wasTruncated = true;
                break;
            }

            output = candidate;
        }

        return {output, wasTruncated};
    }

    #buildHeader() {
        const siteTitle = settingsCache.get('title') || new URL(config.get('url')).hostname;
        const siteDescription = settingsCache.get('meta_description') || settingsCache.get('description');

        return [
            `# ${siteTitle}`,
            siteDescription ? `> ${siteDescription}` : '> Public Ghost publication content.'
        ].join('\n');
    }

    #buildIndexSection(entries) {
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

    #buildOptionalSection() {
        const optionalLinks = [];
        const rssUrl = routing.registry.getRssUrl({absolute: true});

        if (rssUrl) {
            optionalLinks.push(`- [RSS Feed](${rssUrl})`);
        }

        optionalLinks.push(`- [Sitemap](${urlUtils.urlFor({relativeUrl: '/sitemap.xml'}, true)})`);

        return optionalLinks.join('\n');
    }

    #buildFullEntry(entry) {
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

    async #fetchPublicEntries(type) {
        const page = await models.Post.findPage({
            limit: 'all',
            order: type === 'post' ? 'published_at desc' : 'id asc',
            filter: `status:published+visibility:public+type:${type}`,
            columns: ['id', 'title', 'html', 'plaintext', 'custom_excerpt', 'updated_at', 'published_at', 'created_at']
        });

        const entries = page.data.map((model) => {
            const entry = model.toJSON();
            entry.url = urlService.getUrlByResourceId(entry.id, {absolute: true});
            return entry;
        }).filter(entry => entry.url && !entry.url.endsWith('/404/'));

        if (type === 'page') {
            entries.sort((left, right) => left.url.localeCompare(right.url));
        }

        return entries;
    }
}

module.exports = new LlmsService();
module.exports.LlmsService = LlmsService;
