const moment = require('moment');

// Source normalization mapping - consolidated from frontend apps
const SOURCE_NORMALIZATION_MAP = new Map([
    // Social Media Consolidation
    ['facebook', 'Facebook'],
    ['www.facebook.com', 'Facebook'],
    ['l.facebook.com', 'Facebook'],
    ['lm.facebook.com', 'Facebook'],
    ['m.facebook.com', 'Facebook'],
    ['twitter', 'Twitter'],
    ['x.com', 'Twitter'],
    ['com.twitter.android', 'Twitter'],
    ['go.bsky.app', 'Bluesky'],
    ['bsky', 'Bluesky'],
    ['bsky.app', 'Bluesky'],
    ['linkedin', 'LinkedIn'],
    ['www.linkedin.com', 'LinkedIn'],
    ['linkedin.com', 'LinkedIn'],
    ['instagram', 'Instagram'],
    ['www.instagram.com', 'Instagram'],
    ['instagram.com', 'Instagram'],
    ['youtube', 'YouTube'],
    ['www.youtube.com', 'YouTube'],
    ['youtube.com', 'YouTube'],
    ['m.youtube.com', 'YouTube'],
    ['threads', 'Threads'],
    ['www.threads.net', 'Threads'],
    ['threads.net', 'Threads'],
    ['tiktok', 'TikTok'],
    ['www.tiktok.com', 'TikTok'],
    ['tiktok.com', 'TikTok'],
    ['pinterest', 'Pinterest'],
    ['www.pinterest.com', 'Pinterest'],
    ['pinterest.com', 'Pinterest'],
    ['reddit', 'Reddit'],
    ['www.reddit.com', 'Reddit'],
    ['reddit.com', 'Reddit'],
    ['whatsapp', 'WhatsApp'],
    ['whatsapp.com', 'WhatsApp'],
    ['www.whatsapp.com', 'WhatsApp'],
    ['telegram', 'Telegram'],
    ['telegram.org', 'Telegram'],
    ['www.telegram.org', 'Telegram'],
    ['t.me', 'Telegram'],
    ['news.ycombinator.com', 'Hacker News'],
    ['substack', 'Substack'],
    ['substack.com', 'Substack'],
    ['www.substack.com', 'Substack'],
    ['medium', 'Medium'],
    ['medium.com', 'Medium'],
    ['www.medium.com', 'Medium'],

    // Search Engines
    ['google', 'Google'],
    ['www.google.com', 'Google'],
    ['google.com', 'Google'],
    ['bing', 'Bing'],
    ['www.bing.com', 'Bing'],
    ['bing.com', 'Bing'],
    ['yahoo', 'Yahoo'],
    ['www.yahoo.com', 'Yahoo'],
    ['yahoo.com', 'Yahoo'],
    ['search.yahoo.com', 'Yahoo'],
    ['duckduckgo', 'DuckDuckGo'],
    ['duckduckgo.com', 'DuckDuckGo'],
    ['www.duckduckgo.com', 'DuckDuckGo'],
    ['search.brave.com', 'Brave Search'],
    ['yandex', 'Yandex'],
    ['yandex.com', 'Yandex'],
    ['www.yandex.com', 'Yandex'],
    ['baidu', 'Baidu'],
    ['baidu.com', 'Baidu'],
    ['www.baidu.com', 'Baidu'],
    ['ecosia', 'Ecosia'],
    ['www.ecosia.org', 'Ecosia'],
    ['ecosia.org', 'Ecosia'],

    // Email Platforms
    ['gmail', 'Gmail'],
    ['mail.google.com', 'Gmail'],
    ['gmail.com', 'Gmail'],
    ['outlook', 'Outlook'],
    ['outlook.live.com', 'Outlook'],
    ['outlook.com', 'Outlook'],
    ['hotmail.com', 'Outlook'],
    ['mail.yahoo.com', 'Yahoo Mail'],
    ['ymail.com', 'Yahoo Mail'],
    ['icloud.com', 'Apple Mail'],
    ['me.com', 'Apple Mail'],
    ['mac.com', 'Apple Mail'],

    // News Aggregators
    ['news.google.com', 'Google News'],
    ['apple.news', 'Apple News'],
    ['flipboard', 'Flipboard'],
    ['flipboard.com', 'Flipboard'],
    ['www.flipboard.com', 'Flipboard'],
    ['smartnews', 'SmartNews'],
    ['smartnews.com', 'SmartNews'],
    ['www.smartnews.com', 'SmartNews']
]);

/**
 * Normalize source names to consistent display names
 * @param {string|null} source - Raw source string from referrer data
 * @returns {string} Normalized source name or 'Direct' for empty/null sources
 */
function normalizeSource(source) {
    if (!source || source === '') {
        return 'Direct';
    }

    // Case-insensitive lookup
    const lowerSource = source.toLowerCase();
    return SOURCE_NORMALIZATION_MAP.get(lowerSource) || source;
}

class ReferrersStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     **/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     * Return a list of all the attribution sources for a given post, with their signup and conversion counts
     * @param {string} postId
     * @returns {Promise<AttributionCountStat[]>}
     */
    async getForPost(postId) {
        const knex = this.knex;
        const signupRows = await knex('members_created_events')
            .select('referrer_source')
            .select(knex.raw('COUNT(id) AS total'))
            .where('attribution_id', postId)
            .where('attribution_type', 'post')
            .groupBy('referrer_source');

        const conversionRows = await knex('members_subscription_created_events')
            .select('referrer_source')
            .select(knex.raw('COUNT(id) AS total'))
            .where('attribution_id', postId)
            .where('attribution_type', 'post')
            .groupBy('referrer_source');

        // Stitch them toghether, grouping them by source

        const map = new Map();
        for (const row of signupRows) {
            const normalizedSource = normalizeSource(row.referrer_source);
            const existing = map.get(normalizedSource) || {
                source: normalizedSource,
                signups: 0,
                paid_conversions: 0
            };
            existing.signups += row.total;
            map.set(normalizedSource, existing);
        }

        for (const row of conversionRows) {
            const normalizedSource = normalizeSource(row.referrer_source);
            const existing = map.get(normalizedSource) || {
                source: normalizedSource,
                signups: 0,
                paid_conversions: 0
            };
            existing.paid_conversions += row.total;
            map.set(normalizedSource, existing);
        }

        return [...map.values()].sort((a, b) => b.paid_conversions - a.paid_conversions);
    }

    /**
     * Return a list of all the attribution sources, with their signup and conversion counts on each date
     * @returns {Promise<{data: AttributionCountStat[], meta: {}}>}
     */
    async getReferrersHistory() {
        const paidConversionEntries = await this.fetchAllPaidConversionSources();
        const signupEntries = await this.fetchAllSignupSources();

        const allEntries = signupEntries.map((entry) => {
            return {
                ...entry,
                paid_conversions: 0,
                date: moment(entry.date).format('YYYY-MM-DD')
            };
        });

        paidConversionEntries.forEach((entry) => {
            const entryDate = moment(entry.date).format('YYYY-MM-DD');
            const existingEntry = allEntries.find(e => e.source === entry.source && e.date === entryDate);

            if (existingEntry) {
                existingEntry.paid_conversions = entry.paid_conversions;
            } else {
                allEntries.push({
                    ...entry,
                    signups: 0,
                    date: entryDate
                });
            }
        });

        // sort allEntries in date ascending format
        allEntries.sort((a, b) => {
            return moment(a.date).diff(moment(b.date));
        });

        return {
            data: allEntries,
            meta: {}
        };
    }

    /**
     * @returns {Promise<PaidConversionsCountStatDate[]>}
     **/
    async fetchAllPaidConversionSources() {
        const knex = this.knex;
        const ninetyDaysAgo = moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const rows = await knex('members_subscription_created_events')
            .select(knex.raw(`DATE(created_at) as date`))
            .select(knex.raw(`COUNT(*) as paid_conversions`))
            .select(knex.raw(`referrer_source as source`))
            .where('created_at', '>=', ninetyDaysAgo)
            .groupBy('date', 'referrer_source')
            .orderBy('date');

        return rows;
    }

    /**
     * @returns {Promise<SignupCountStatDate[]>}
     **/
    async fetchAllSignupSources() {
        const knex = this.knex;
        const ninetyDaysAgo = moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const rows = await knex('members_created_events')
            .select(knex.raw(`DATE(created_at) as date`))
            .select(knex.raw(`COUNT(*) as signups`))
            .select(knex.raw(`referrer_source as source`))
            .where('created_at', '>=', ninetyDaysAgo)
            .groupBy('date', 'referrer_source')
            .orderBy('date');

        return rows;
    }

    /**
     * Fetch paid conversion sources with date range
     * @param {string} startDate 
     * @param {string} endDate 
     * @returns {Promise<PaidConversionsCountStatDate[]>}
     **/
    async fetchPaidConversionSourcesWithRange(startDate, endDate) {
        const knex = this.knex;
        const startDateTime = moment.utc(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const endDateTime = moment.utc(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
        
        const rows = await knex('members_subscription_created_events')
            .select(knex.raw(`DATE(created_at) as date`))
            .select(knex.raw(`COUNT(*) as paid_conversions`))
            .select(knex.raw(`referrer_source as source`))
            .where('created_at', '>=', startDateTime)
            .where('created_at', '<=', endDateTime)
            .groupBy('date', 'referrer_source')
            .orderBy('date');

        return rows;
    }

    /**
     * Fetch signup sources with date range
     * @param {string} startDate 
     * @param {string} endDate 
     * @returns {Promise<SignupCountStatDate[]>}
     **/
    async fetchSignupSourcesWithRange(startDate, endDate) {
        const knex = this.knex;
        const startDateTime = moment.utc(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const endDateTime = moment.utc(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
        
        const rows = await knex('members_created_events')
            .select(knex.raw(`DATE(created_at) as date`))
            .select(knex.raw(`COUNT(*) as signups`))
            .select(knex.raw(`referrer_source as source`))
            .where('created_at', '>=', startDateTime)
            .where('created_at', '<=', endDateTime)
            .groupBy('date', 'referrer_source')
            .orderBy('date');

        return rows;
    }

    /**
     * Fetch MRR sources with date range
     * @param {string} startDate 
     * @param {string} endDate 
     * @returns {Promise<MrrCountStatDate[]>}
     **/
    async fetchMrrSourcesWithRange(startDate, endDate) {
        const knex = this.knex;
        const startDateTime = moment.utc(startDate).startOf('day').format('YYYY-MM-DD HH:mm:ss');
        const endDateTime = moment.utc(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss');
        
        // Join subscription created events with paid subscription events to get MRR changes
        const rows = await knex('members_subscription_created_events as msce')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('msce.member_id', '=', 'mpse.member_id')
                    .andOn('msce.subscription_id', '=', 'mpse.subscription_id');
            })
            .select(knex.raw(`DATE(msce.created_at) as date`))
            .select(knex.raw(`SUM(mpse.mrr_delta) as mrr`))
            .select(knex.raw(`msce.referrer_source as source`))
            .where('msce.created_at', '>=', startDateTime)
            .where('msce.created_at', '<=', endDateTime)
            .where('mpse.mrr_delta', '>', 0) // Only positive MRR changes (new subscriptions)
            .whereNotNull('msce.referrer_source') // Only entries with attribution
            .groupBy('date', 'msce.referrer_source')
            .orderBy('date');

        return rows;
    }

    /**
     * Return aggregated attribution sources for a date range, grouped by source only (not by date)
     * This is used for "Top Sources" tables that need server-side sorting
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @param {string} [orderBy='signups desc'] - Sort order: 'signups desc', 'paid_conversions desc', 'mrr desc', 'source desc'
     * @param {number} [limit=50] - Maximum number of sources to return
     * @returns {Promise<{data: AttributionCountStatWithMrr[], meta: {}}>}
     */
    async getTopSourcesWithRange(startDate, endDate, orderBy = 'signups desc', limit = 50) {
        const paidConversionEntries = await this.fetchPaidConversionSourcesWithRange(startDate, endDate);
        const signupEntries = await this.fetchSignupSourcesWithRange(startDate, endDate);
        const mrrEntries = await this.fetchMrrSourcesWithRange(startDate, endDate);

        // Aggregate by source (not by date + source)
        const sourceMap = new Map();

        // Add signup data
        signupEntries.forEach((entry) => {
            const source = normalizeSource(entry.source);
            const existing = sourceMap.get(source) || {source, signups: 0, paid_conversions: 0, mrr: 0};
            existing.signups += entry.signups;
            sourceMap.set(source, existing);
        });

        // Add paid conversion data
        paidConversionEntries.forEach((entry) => {
            const source = normalizeSource(entry.source);
            const existing = sourceMap.get(source) || {source, signups: 0, paid_conversions: 0, mrr: 0};
            existing.paid_conversions += entry.paid_conversions;
            sourceMap.set(source, existing);
        });

        // Add MRR data
        mrrEntries.forEach((entry) => {
            const source = normalizeSource(entry.source);
            const existing = sourceMap.get(source) || {source, signups: 0, paid_conversions: 0, mrr: 0};
            existing.mrr += entry.mrr;
            sourceMap.set(source, existing);
        });

        // Convert to array and sort
        let results = Array.from(sourceMap.values());

        // Apply sorting - only allow descending sorts for sources
        const [field] = orderBy.split(' ');
        
        results.sort((a, b) => {
            let valueA; let valueB;
            
            switch (field) {
            case 'signups':
                valueA = a.signups;
                valueB = b.signups;
                break;
            case 'paid_conversions':
                valueA = a.paid_conversions;
                valueB = b.paid_conversions;
                break;
            case 'mrr':
                valueA = a.mrr;
                valueB = b.mrr;
                break;
            case 'source':
                valueA = a.source.toLowerCase();
                valueB = b.source.toLowerCase();
                break;
            default:
                return 0;
            }

            // Always sort in descending order (highest to lowest)
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        });

        // Apply limit
        if (limit && limit > 0) {
            results = results.slice(0, limit);
        }

        return {
            data: results,
            meta: {}
        };
    }
}

module.exports = ReferrersStatsService;
module.exports.normalizeSource = normalizeSource;

/**
 * @typedef AttributionCountStat
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paid_conversions Total paid conversions for this source
 */

/**
 * @typedef AttributionCountStatWithMrr
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paid_conversions Total paid conversions for this source
 * @property {number} mrr Total MRR from this source
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 */

/**
 * @typedef AttributionCountStatDate
 * @type {AttributionCountStat}
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 */

/**
 * @typedef {object} SignupCountStatDate
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 **/

/**
 * @typedef {object} PaidConversionsCountStatDate
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} paid_conversions Total paid conversions for this source
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 **/

/**
 * @typedef {object} MrrCountStatDate
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} mrr Total MRR from this source (in cents)
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 **/
