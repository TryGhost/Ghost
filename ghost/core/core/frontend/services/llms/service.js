<<<<<<< HEAD
const htmlToPlaintext = require('@tryghost/html-to-plaintext');

=======
const settingsCache = require('../../../shared/settings-cache');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../../server/models');
const urlService = require('../../../server/services/url');
const events = require('../../../server/lib/common/events');
const htmlToPlaintext = require('@tryghost/html-to-plaintext');
const routing = require('../routing');
const {api} = require('../proxy');
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
const {
    getMarkdownUrl,
    renderEntryMarkdownBody,
    truncateDescription
} = require('./markdown');

<<<<<<< HEAD
const DEFAULT_BUDGET = 5 * 1024 * 1024;
const FULL_PAGE_SIZE = 100;
=======
const FIVE_MIB = 5 * 1024 * 1024;
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
const PAYWALL_MARKER = '<!--members-only-->';

function createLlmsService({settingsCache, labs, config, urlServiceFacade, models, api, fullTxtBudget}) {
    const BUDGET = fullTxtBudget || DEFAULT_BUDGET;

<<<<<<< HEAD
    function isEnabled() {
        return labs.isSet('llmsTxt') && !settingsCache.get('is_private') && settingsCache.get('llms_enabled') !== false;
=======
        this.events.on('site.changed', this.invalidate);
        this.events.on('routers.reset', this.invalidate);
        this.events.on('url.added', this.invalidate);
        this.events.on('url.removed', this.invalidate);
        this.events.on('settings.title.edited', this.invalidate);
        this.events.on('settings.description.edited', this.invalidate);
        this.events.on('settings.meta_description.edited', this.invalidate);
        this.events.on('settings.llms_enabled.edited', this.invalidate);
        this.events.on('settings.machine_payments_enabled.edited', this.invalidate);
        this.events.on('settings.edited', this.handleSettingEdited);
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
    }

    function isMachinePaymentsEnabled() {
        return labs.isSet('machinePayments') && settingsCache.get('machine_payments_enabled') === true;
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

    async function fetchPaidEntry(resourceType, id) {
        const type = resourceType === 'pages' ? 'page' : 'post';
        const model = await models.Post.findOne({
            id,
            type,
            status: 'published'
        }, {
            withRelated: ['authors', 'tags', 'tiers']
        });

        if (!model) {
            return null;
        }

        const entry = model.toJSON();
        entry.type = entry.type || type;
        entry.url = resolveEntryUrl(entry);
        return entry.url ? entry : null;
    }

    async function getLlmsTxt() {
        if (!isEnabled()) {
            return null;
        }

<<<<<<< HEAD
        const posts = await fetchPostIndexEntries();
        const sections = [
            buildHeader({includeDescription: false}),
            buildIndexSection(posts)
        ].filter(Boolean);
=======
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
            this.#fetchPostIndexEntries()
        ]);

        const sections = [
            this.#buildHeader({includeDescription: false}),
            '## Pages',
            this.#buildIndexSection(pages),
            '',
            '## Posts',
            this.#buildIndexSection(posts),
            '',
            '## Optional',
            this.#buildOptionalSection()
        ];
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)

        return `${sections.join('\n\n').trim()}\n`;
    }

    async function getLlmsFullTxt() {
        if (!isEnabled()) {
            return null;
        }

        let output = `${buildHeader()}\n\n`;
        output = (await appendBoundedEntriesPaginated(output, 'post')).output;

        return output.trimEnd() + '\n';
    }

    async function appendBoundedEntriesPaginated(prefix, type) {
        if (Buffer.byteLength(prefix, 'utf8') > BUDGET) {
            return {output: prefix, wasTruncated: true};
        }

        let output = prefix;
        let wasTruncated = false;
        let page = 1;
        let hasMore = true;

        while (hasMore && !wasTruncated) {
            const result = await fetchFullEntries(type, page);
            hasMore = result.hasMore;

            for (const entry of result.entries) {
                const formattedEntry = buildFullEntry(entry);
                const candidate = `${output}${formattedEntry}\n\n`;

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

<<<<<<< HEAD
    function buildHeader({includeDescription = true} = {}) {
=======
    #buildHeader({includeDescription = true} = {}) {
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
        const siteTitle = settingsCache.get('title') || new URL(config.get('url')).hostname;
        const siteDescription = settingsCache.get('meta_description') || settingsCache.get('description');

        if (!includeDescription) {
            return `# ${siteTitle}`;
        }

        return [
            `# ${siteTitle}`,
            siteDescription ? `> ${siteDescription}` : null
        ].filter(Boolean).join('\n');
    }

    function buildIndexSection(entries) {
        if (!entries.length) {
            return '';
        }

        return entries.map((entry) => {
<<<<<<< HEAD
            const description = buildIndexDescription(entry);
=======
            const description = this.#buildIndexDescription(entry);
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
            const linkLine = `- [${entry.title}](${getMarkdownUrl(entry.url)})`;

            if (!description) {
                return linkLine;
            }

            return `${linkLine}: ${description}`;
        }).join('\n');
    }

<<<<<<< HEAD
    function buildIndexDescription(entry) {
        const description = entry.custom_excerpt || entry.excerpt || getIndexPlaintext(entry);
=======
    #buildIndexDescription(entry) {
        const description = entry.custom_excerpt || entry.excerpt || this.#getIndexPlaintext(entry);

        return truncateDescription(description);
    }

    #getIndexPlaintext(entry) {
        if (!this.#isPaidMembersOnlyEntry(entry)) {
            return entry.plaintext;
        }

        if (!entry.html) {
            return null;
        }

        const paywallIndex = entry.html.indexOf(PAYWALL_MARKER);

        if (paywallIndex === -1) {
            return null;
        }

        return htmlToPlaintext.excerpt(entry.html.slice(0, paywallIndex));
    }

    #buildOptionalSection() {
        const optionalLinks = [];
        const rssUrl = routing.registry.getRssUrl({absolute: true});
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)

        return truncateDescription(description);
    }

    function getIndexPlaintext(entry) {
        if (!isPaidMembersOnlyEntry(entry)) {
            return entry.plaintext;
        }

        if (!entry.html) {
            return null;
        }

        const paywallIndex = entry.html.indexOf(PAYWALL_MARKER);

        if (paywallIndex === -1) {
            return null;
        }

        return htmlToPlaintext.excerpt(entry.html.slice(0, paywallIndex));
    }

    function buildFullEntry(entry) {
        const lastUpdated = entry.updated_at || entry.published_at || entry.created_at;
        const lastUpdatedLine = lastUpdated ? `Last updated: ${new Date(lastUpdated).toISOString()}` : null;
        const markdownBody = renderEntryMarkdownBody(entry);
        const metadataLines = [
            entry.title ? `## ${entry.title}` : null,
            `URL: ${entry.url}`
        ].filter(Boolean);

        if (lastUpdatedLine) {
            metadataLines.push(lastUpdatedLine);
        }

        return markdownBody ? [
            ...metadataLines,
            '',
            markdownBody
        ].join('\n') : metadataLines.join('\n');
    }

    function resolveEntryUrl(entry) {
        const url = urlServiceFacade.getUrlForResource(
            {...entry, type: entry.type, id: entry.id},
            {absolute: true}
        );
        return url && !url.endsWith('/404/') ? url : null;
    }

    async function fetchPublicEntries(type) {
        const page = await models.Post.findPage({
            limit: 'all',
            order: type === 'post' ? 'published_at desc' : 'id asc',
            filter: `status:published+visibility:public+type:${type}`,
            columns: ['id', 'title', 'slug', 'html', 'plaintext', 'custom_excerpt', 'updated_at', 'published_at', 'created_at', 'type'],
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

<<<<<<< HEAD
    async function fetchPostIndexEntries() {
        const publicEntries = await fetchPublicEntries('post');

        if (!isMachinePaymentsEnabled()) {
            return publicEntries;
        }

        const paidEntries = await fetchMachinePaymentPostEntries();

        return [...publicEntries, ...paidEntries].sort((left, right) => {
            return getPublishedOrderValue(right) - getPublishedOrderValue(left);
        });
    }

    async function fetchMachinePaymentPostEntries() {
=======
    async #fetchPostIndexEntries() {
        const publicEntries = await this.#fetchPublicEntries('post');

        if (settingsCache.get('machine_payments_enabled') !== true) {
            return publicEntries;
        }

        const paidEntries = await this.#fetchMachinePaymentPostEntries();

        return [...publicEntries, ...paidEntries].sort((left, right) => {
            return this.#getPublishedOrderValue(right) - this.#getPublishedOrderValue(left);
        });
    }

    async #fetchMachinePaymentPostEntries() {
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
        const page = await models.Post.findPage({
            limit: 'all',
            order: 'published_at desc',
            filter: 'status:published+visibility:[paid,tiers]+type:post',
<<<<<<< HEAD
            columns: ['id', 'title', 'slug', 'html', 'custom_excerpt', 'visibility', 'published_at', 'type'],
            withRelated: ['tiers']
        });

        return page.data.map((model) => {
            const entry = model.toJSON();
            entry.url = resolveEntryUrl(entry);
            return entry;
        }).filter(entry => isPaidMembersOnlyEntry(entry) && entry.url);
    }

    function getPublishedOrderValue(entry) {
=======
            columns: ['id', 'title', 'html', 'custom_excerpt', 'visibility', 'published_at'],
            withRelated: ['tiers']
        });

        const entries = page.data.map((model) => {
            const entry = model.toJSON();
            entry.url = urlService.getUrlByResourceId(entry.id, {absolute: true});
            return entry;
        }).filter(entry => this.#isPaidMembersOnlyEntry(entry) && entry.url && !entry.url.endsWith('/404/'));

        return entries;
    }

    #getPublishedOrderValue(entry) {
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
        const publishedAt = entry.published_at ? new Date(entry.published_at).getTime() : 0;
        return Number.isNaN(publishedAt) ? 0 : publishedAt;
    }

<<<<<<< HEAD
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

    function isPaidMembersOnlyEntry(entry) {
=======
    #isPaidMembersOnlyEntry(entry) {
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
        if (entry.visibility === 'paid') {
            return true;
        }

        if (entry.visibility !== 'tiers') {
            return false;
        }

        return Array.isArray(entry.tiers) && entry.tiers.length > 0 && entry.tiers.every(tier => tier.type === 'paid');
    }
<<<<<<< HEAD

    return {isEnabled, getLlmsTxt, getLlmsFullTxt, fetchPublicEntry, fetchPaidEntry};
=======
>>>>>>> de4e22fd52 (✨ Added premium markdown URLs to llms.txt)
}

module.exports = {createLlmsService};
