const moment = require('moment');
const errors = require('@tryghost/errors');

// Import centralized date utilities
const {getDateBoundaries, applyDateFilter} = require('./utils/date-utils');

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
     * Fetch MRR sources with date range
     * @param {Object} options
     * @returns {Promise<MrrCountStatDate[]>}
     **/
    async fetchMrrSourcesWithRange(options) {
        const knex = this.knex;
        const {dateFrom: startDateTime, dateTo: endDateTime} = getDateBoundaries(options);

        // Join subscription created events with paid subscription events to get MRR changes
        let query = knex('members_subscription_created_events as msce')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('msce.member_id', '=', 'mpse.member_id')
                    .andOn('msce.subscription_id', '=', 'mpse.subscription_id');
            })
            .select(knex.raw(`DATE(msce.created_at) as date`))
            .select(knex.raw(`SUM(mpse.mrr_delta) as mrr`))
            .select(knex.raw(`msce.referrer_source as source`))
            .where('mpse.mrr_delta', '>', 0) // Only positive MRR changes (new subscriptions)
            .whereNotNull('msce.referrer_source') // Only entries with attribution
            .groupBy('date', 'msce.referrer_source')
            .orderBy('date');

        // Apply centralized date filtering
        applyDateFilter(query, startDateTime, endDateTime, 'msce.created_at');

        const rows = await query;

        return rows;
    }

    /**
     * Fetch deduplicated member counts by source with date range
     * Returns both free signups (excluding those who converted) and paid conversions
     * @param {Object} options
     * @returns {Promise<{source: string, signups: number, paid_conversions: number}[]>}
     **/
    async fetchMemberCountsBySource(options) {
        const knex = this.knex;
        const {dateFrom: startDateTime, dateTo: endDateTime} = getDateBoundaries(options);

        // Query 1: Free members who haven't converted to paid within the same time window
        const freeSignupsQuery = knex('members_created_events as mce')
            .select('mce.referrer_source as source')
            .select(knex.raw('COUNT(DISTINCT mce.member_id) as signups'))
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    // Only join if the conversion happened within the same time window
                    .andOn('msce.created_at', '>=', knex.raw('?', [startDateTime]))
                    .andOn('msce.created_at', '<=', knex.raw('?', [endDateTime]));
            })
            .whereNull('msce.id')
            .groupBy('mce.referrer_source');

        // Apply date filtering to the main query
        applyDateFilter(freeSignupsQuery, startDateTime, endDateTime, 'mce.created_at');

        // Query 2: Paid conversions
        const paidConversionsQuery = knex('members_subscription_created_events as msce')
            .select('msce.referrer_source as source')
            .select(knex.raw('COUNT(DISTINCT msce.member_id) as paid_conversions'))
            .groupBy('msce.referrer_source');

        // Apply date filtering to the paid conversions query
        applyDateFilter(paidConversionsQuery, startDateTime, endDateTime, 'msce.created_at');

        // Execute both queries in parallel
        const [freeResults, paidResults] = await Promise.all([
            freeSignupsQuery,
            paidConversionsQuery
        ]);

        // Combine results by source
        const sourceMap = new Map();

        // Add free signups
        freeResults.forEach((row) => {
            sourceMap.set(row.source, {
                source: row.source,
                signups: parseInt(row.signups) || 0,
                paid_conversions: 0
            });
        });

        // Add paid conversions
        paidResults.forEach((row) => {
            const existing = sourceMap.get(row.source);
            if (existing) {
                existing.paid_conversions = parseInt(row.paid_conversions) || 0;
            } else {
                sourceMap.set(row.source, {
                    source: row.source,
                    signups: 0,
                    paid_conversions: parseInt(row.paid_conversions) || 0
                });
            }
        });

        return Array.from(sourceMap.values());
    }

    /**
     * Return aggregated attribution sources for a date range, grouped by source only (not by date)
     * This is used for "Top Sources" tables that need server-side sorting
     * @param {Object} options
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @param {string} [options.orderBy='signups desc'] - Sort order: 'signups desc', 'paid_conversions desc', 'mrr desc', 'source desc'
     * @param {number} [options.limit=50] - Maximum number of sources to return
     * @returns {Promise<{data: AttributionCountStatWithMrr[], meta: {}}>}
     */
    async getTopSourcesWithRange(options = {}) {
        const {orderBy = 'signups desc', limit = 50} = options;

        // Get deduplicated member counts and MRR data in parallel
        const [memberCounts, mrrEntries] = await Promise.all([
            this.fetchMemberCountsBySource(options),
            this.fetchMrrSourcesWithRange(options)
        ]);

        // Aggregate by source (not by date + source)
        const sourceMap = new Map();

        // Add member counts (both signups and paid conversions)
        memberCounts.forEach((entry) => {
            const source = normalizeSource(entry.source);
            const existing = sourceMap.get(source);
            if (existing) {
                // Aggregate if the normalized source already exists (e.g., multiple null/empty values)
                existing.signups += entry.signups;
                existing.paid_conversions += entry.paid_conversions;
            } else {
                sourceMap.set(source, {
                    source,
                    signups: entry.signups,
                    paid_conversions: entry.paid_conversions,
                    mrr: 0
                });
            }
        });

        // Add MRR data
        mrrEntries.forEach((entry) => {
            const source = normalizeSource(entry.source);
            const existing = sourceMap.get(source);
            if (existing) {
                existing.mrr += entry.mrr;
            } else {
                sourceMap.set(source, {
                    source,
                    signups: 0,
                    paid_conversions: 0,
                    mrr: entry.mrr
                });
            }
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

    /**
     * Fetch free member counts by UTM parameter with date range
     * Returns members who haven't converted to paid within the same time window
     * @param {string} utmField - The UTM field to group by
     * @param {Object} options - Query options
     * @returns {Promise<{utm_value: string, signups: number}[]>}
     **/
    async fetchMemberCountsByUtm(utmField, options) {
        // Validate utm_field for defense-in-depth (even though caller validates)
        const validUtmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        if (!validUtmFields.includes(utmField)) {
            throw new errors.BadRequestError({
                message: `Invalid UTM field: ${utmField}. Must be one of: ${validUtmFields.join(', ')}`
            });
        }

        const knex = this.knex;
        const {dateFrom: startDateTime, dateTo: endDateTime} = getDateBoundaries(options);
        const {post_id: postId} = options;

        // Query: Free members who haven't converted to paid within the same time window
        const freeSignupsQuery = knex('members_created_events as mce')
            .select(knex.raw(`mce.${utmField} as utm_value`))
            .select(knex.raw('COUNT(DISTINCT mce.member_id) as signups'))
            .leftJoin('members_subscription_created_events as msce', function () {
                this.on('mce.member_id', '=', 'msce.member_id')
                    // Filter msce.created_at: only count conversions within the same time window
                    // This ensures we don't count conversions that happened outside our date range
                    .andOn('msce.created_at', '>=', knex.raw('?', [startDateTime]))
                    .andOn('msce.created_at', '<=', knex.raw('?', [endDateTime]));
            })
            .whereNull('msce.id')
            .whereNotNull(`mce.${utmField}`)
            .groupBy(`mce.${utmField}`);

        // Filter mce.created_at: only include members created within the date range
        applyDateFilter(freeSignupsQuery, startDateTime, endDateTime, 'mce.created_at');

        // Apply post filtering if post_id is provided
        if (postId) {
            freeSignupsQuery
                .where('mce.attribution_id', postId)
                .where('mce.attribution_type', 'post');
        }

        const results = await freeSignupsQuery;
        return results.map(row => ({
            utm_value: row.utm_value,
            signups: parseInt(row.signups) || 0
        }));
    }

    /**
     * Fetch paid conversion counts by UTM parameter with date range
     * @param {string} utmField - The UTM field to group by
     * @param {Object} options - Query options
     * @returns {Promise<{utm_value: string, paid_conversions: number}[]>}
     **/
    async fetchPaidConversionsByUtm(utmField, options) {
        // Validate utm_field for defense-in-depth (even though caller validates)
        const validUtmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        if (!validUtmFields.includes(utmField)) {
            throw new errors.BadRequestError({
                message: `Invalid UTM field: ${utmField}. Must be one of: ${validUtmFields.join(', ')}`
            });
        }

        const knex = this.knex;
        const {dateFrom: startDateTime, dateTo: endDateTime} = getDateBoundaries(options);
        const {post_id: postId} = options;

        const paidConversionsQuery = knex('members_subscription_created_events as msce')
            .select(knex.raw(`msce.${utmField} as utm_value`))
            .select(knex.raw('COUNT(DISTINCT msce.member_id) as paid_conversions'))
            .whereNotNull(`msce.${utmField}`)
            .groupBy(`msce.${utmField}`);

        // Apply date filtering
        applyDateFilter(paidConversionsQuery, startDateTime, endDateTime, 'msce.created_at');

        // Apply post filtering if post_id is provided
        if (postId) {
            paidConversionsQuery
                .where('msce.attribution_id', postId)
                .where('msce.attribution_type', 'post');
        }

        const results = await paidConversionsQuery;
        return results.map(row => ({
            utm_value: row.utm_value,
            paid_conversions: parseInt(row.paid_conversions) || 0
        }));
    }

    /**
     * Fetch MRR by UTM parameter with date range
     * @param {string} utmField - The UTM field to group by
     * @param {Object} options - Query options
     * @returns {Promise<{utm_value: string, mrr: number}[]>}
     **/
    async fetchMrrByUtm(utmField, options) {
        // Validate utm_field for defense-in-depth (even though caller validates)
        const validUtmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        if (!validUtmFields.includes(utmField)) {
            throw new errors.BadRequestError({
                message: `Invalid UTM field: ${utmField}. Must be one of: ${validUtmFields.join(', ')}`
            });
        }

        const knex = this.knex;
        const {dateFrom: startDateTime, dateTo: endDateTime} = getDateBoundaries(options);
        const {post_id: postId} = options;

        // Join subscription created events with paid subscription events to get MRR changes
        let query = knex('members_subscription_created_events as msce')
            .join('members_paid_subscription_events as mpse', function () {
                this.on('msce.member_id', '=', 'mpse.member_id')
                    .andOn('msce.subscription_id', '=', 'mpse.subscription_id');
            })
            .select(knex.raw(`msce.${utmField} as utm_value`))
            .select(knex.raw(`SUM(mpse.mrr_delta) as mrr`))
            .where('mpse.mrr_delta', '>', 0) // Only positive MRR changes (new subscriptions)
            .whereNotNull(`msce.${utmField}`)
            .groupBy(`msce.${utmField}`);

        // Apply date filtering
        applyDateFilter(query, startDateTime, endDateTime, 'msce.created_at');

        // Apply post filtering if post_id is provided
        if (postId) {
            query
                .where('msce.attribution_id', postId)
                .where('msce.attribution_type', 'post');
        }

        const results = await query;
        return results.map(row => ({
            utm_value: row.utm_value,
            mrr: parseInt(row.mrr) || 0
        }));
    }

    /**
     * Get UTM growth stats broken down by UTM parameter
     * @param {Object} options
     * @param {string} [options.utm_type='utm_source'] - Which UTM field to group by ('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content')
     * @param {string} [options.order='free_members desc'] - Sort order
     * @param {number} [options.limit=50] - Maximum number of results
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @param {string} [options.timezone] - Timezone to use for date interpretation
     * @param {string} [options.post_id] - Optional filter by post ID
     * @returns {Promise<{data: UtmGrowthStat[], meta: {}}>}
     */
    async getUtmGrowthStats(options = {}) {
        const utmField = options.utm_type || 'utm_source';
        const limit = options.limit || 50;
        const postId = options.post_id;
        const orderBy = options.order || 'free_members desc';

        // Validate utm_type is a valid UTM field
        const validUtmFields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        if (!validUtmFields.includes(utmField)) {
            throw new errors.BadRequestError({
                message: `Invalid utm_type: ${utmField}. Must be one of: ${validUtmFields.join(', ')}`
            });
        }

        // Fetch data from database in parallel
        const [freeMembers, paidConversions, mrrData] = await Promise.all([
            this.fetchMemberCountsByUtm(utmField, options),
            this.fetchPaidConversionsByUtm(utmField, options),
            this.fetchMrrByUtm(utmField, options)
        ]);

        // Combine results by utm_value
        const utmMap = new Map();

        // Add free members
        freeMembers.forEach((row) => {
            utmMap.set(row.utm_value, {
                utm_value: row.utm_value,
                utm_type: utmField,
                free_members: row.signups,
                paid_members: 0,
                mrr: 0
            });
        });

        // Add paid conversions
        paidConversions.forEach((row) => {
            const existing = utmMap.get(row.utm_value);
            if (existing) {
                existing.paid_members = row.paid_conversions;
            } else {
                utmMap.set(row.utm_value, {
                    utm_value: row.utm_value,
                    utm_type: utmField,
                    free_members: 0,
                    paid_members: row.paid_conversions,
                    mrr: 0
                });
            }
        });

        // Add MRR data
        mrrData.forEach((row) => {
            const existing = utmMap.get(row.utm_value);
            if (existing) {
                existing.mrr = row.mrr;
            } else {
                utmMap.set(row.utm_value, {
                    utm_value: row.utm_value,
                    utm_type: utmField,
                    free_members: 0,
                    paid_members: 0,
                    mrr: row.mrr
                });
            }
        });

        // Convert to array
        let results = Array.from(utmMap.values());

        // Apply sorting
        const [field, direction] = orderBy.split(' ');
        const validFields = ['free_members', 'paid_members', 'mrr', 'utm_value'];

        if (validFields.includes(field)) {
            results.sort((a, b) => {
                let valueA = a[field];
                let valueB = b[field];

                // Handle string sorting for utm_value
                if (field === 'utm_value') {
                    valueA = String(valueA).toLowerCase();
                    valueB = String(valueB).toLowerCase();
                }

                if (direction === 'asc') {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                }
                // Default to desc
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            });
        }

        // Apply limit (but not when filtering by post as per original implementation)
        if (!postId && limit && limit > 0) {
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

/**
 * @typedef {object} UtmGrowthStat
 * @type {Object}
 * @property {string} utm_value - The UTM parameter value (e.g., 'google', 'facebook')
 * @property {string} utm_type - The UTM parameter type ('utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content')
 * @property {number} free_members - Count of free member signups
 * @property {number} paid_members - Count of paid member conversions
 * @property {number} mrr - Total MRR from this UTM parameter (in cents)
 **/
