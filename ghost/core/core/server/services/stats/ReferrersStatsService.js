const moment = require('moment');

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
     * @param {Object} [options]
     * @param {string} [options.date_from] - Start date in YYYY-MM-DD format
     * @param {string} [options.date_to] - End date in YYYY-MM-DD format
     * @returns {Promise<AttributionCountStat[]>}
     */
    async getForPost(postId, options = {}) {
        const knex = this.knex;
        
        // First, get all members who have paid conversions, so we can exclude them from free signups
        const paidMembersQuery = knex('members_subscription_created_events')
            .select('member_id')
            .where('attribution_id', postId)
            .where('attribution_type', 'post');
            
        if (options.date_from) {
            paidMembersQuery.where('created_at', '>=', `${options.date_from} 00:00:00`);
        }
            
        if (options.date_to) {
            paidMembersQuery.where('created_at', '<=', `${options.date_to} 23:59:59`);
        }
        
        const paidMemberIds = await paidMembersQuery;
        
        // Get all free signups, excluding members who have paid subscriptions
        const freeSignupsQuery = knex('members_created_events')
            .select('referrer_source')
            .select(knex.raw('COUNT(id) AS total'))
            .where('attribution_id', postId)
            .where('attribution_type', 'post');
            
        if (paidMemberIds.length > 0) {
            freeSignupsQuery.whereNotIn(
                'member_id', 
                paidMemberIds.map(row => row.member_id)
            );
        }
        
        if (options.date_from) {
            freeSignupsQuery.where('created_at', '>=', `${options.date_from} 00:00:00`);
        }
        
        if (options.date_to) {
            freeSignupsQuery.where('created_at', '<=', `${options.date_to} 23:59:59`);
        }
        
        const freeSignupRows = await freeSignupsQuery.groupBy('referrer_source');

        // Get paid conversions with MRR values by joining with members_paid_subscription_events
        const paidConversionsQuery = knex('members_subscription_created_events AS msce')
            .select('msce.referrer_source')
            .select(knex.raw('COUNT(msce.id) AS total'))
            .select(knex.raw('SUM(COALESCE(mpse.mrr_delta, 0)) AS mrr'))
            .leftJoin('members_paid_subscription_events AS mpse', 'msce.subscription_id', 'mpse.subscription_id')
            .where('msce.attribution_id', postId)
            .where('msce.attribution_type', 'post');
            
        if (options.date_from) {
            paidConversionsQuery.where('msce.created_at', '>=', `${options.date_from} 00:00:00`);
        }
            
        if (options.date_to) {
            paidConversionsQuery.where('msce.created_at', '<=', `${options.date_to} 23:59:59`);
        }
            
        const paidConversionRows = await paidConversionsQuery.groupBy('msce.referrer_source');

        // Combine free signups and paid conversions by referrer source
        const map = new Map();
        for (const row of freeSignupRows) {
            map.set(row.referrer_source, {
                source: row.referrer_source,
                signups: row.total,
                paid_conversions: 0,
                mrr: 0
            });
        }

        for (const row of paidConversionRows) {
            const existing = map.get(row.referrer_source) ?? {
                source: row.referrer_source,
                signups: 0,
                paid_conversions: 0,
                mrr: 0
            };
            existing.paid_conversions = row.total;
            existing.mrr = parseInt(row.mrr) || 0;
            map.set(row.referrer_source, existing);
        }

        // Sort results by paid conversions (most first)
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
                mrr: 0,
                date: moment(entry.date).format('YYYY-MM-DD')
            };
        });

        paidConversionEntries.forEach((entry) => {
            const entryDate = moment(entry.date).format('YYYY-MM-DD');
            const existingEntry = allEntries.find(e => e.source === entry.source && e.date === entryDate);

            if (existingEntry) {
                existingEntry.paid_conversions = entry.paid_conversions;
                existingEntry.mrr = entry.mrr || 0;
            } else {
                allEntries.push({
                    ...entry,
                    signups: 0,
                    mrr: entry.mrr || 0,
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
        
        // Join with members_paid_subscription_events to get actual MRR values
        const queryResult = await knex('members_subscription_created_events AS msce')
            .select(knex.raw(`DATE(msce.created_at) as date`))
            .select(knex.raw(`COUNT(msce.id) as paid_conversions`))
            .select(knex.raw(`msce.referrer_source as source`))
            .select(knex.raw(`SUM(COALESCE(mpse.mrr_delta, 0)) as mrr`))
            .leftJoin('members_paid_subscription_events AS mpse', 'msce.subscription_id', 'mpse.subscription_id')
            .where('msce.created_at', '>=', ninetyDaysAgo)
            .groupBy('date', 'msce.referrer_source')
            .orderBy('date');

        // Convert Knex results to plain objects to avoid type issues
        const plainResults = JSON.parse(JSON.stringify(queryResult));
        
        // Return with proper type structure
        return plainResults.map(row => ({
            source: row.source || null,
            paid_conversions: parseInt(row.paid_conversions) || 0,
            date: row.date,
            mrr: parseInt(row.mrr) || 0
        }));
    }

    /**
     * @returns {Promise<SignupCountStatDate[]>}
     **/
    async fetchAllSignupSources() {
        const knex = this.knex;
        const ninetyDaysAgo = moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        
        const queryResult = await knex('members_created_events')
            .select(knex.raw(`DATE(created_at) as date`))
            .select(knex.raw(`COUNT(*) as signups`))
            .select(knex.raw(`referrer_source as source`))
            .where('created_at', '>=', ninetyDaysAgo)
            .groupBy('date', 'referrer_source')
            .orderBy('date');

        // Convert Knex results to plain objects to avoid type issues
        const plainResults = JSON.parse(JSON.stringify(queryResult));

        // Return with proper type structure
        return plainResults.map(row => ({
            source: row.source || null,
            signups: parseInt(row.signups) || 0,
            date: row.date,
            mrr: 0
        }));
    }
}

module.exports = ReferrersStatsService;

/**
 * @typedef AttributionCountStat
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} signups Total free members signed up for this source
 * @property {number} paid_conversions Total paid conversions for this source
 * @property {number} mrr Monthly Recurring Revenue in the site's currency
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
 * @property {number} mrr Monthly Recurring Revenue in the site's currency
 **/

/**
 * @typedef {object} PaidConversionsCountStatDate
 * @type {Object}
 * @property {string} source Attribution Source
 * @property {number} paid_conversions Total paid conversions for this source
 * @property {string} date The date (YYYY-MM-DD) on which these counts were recorded
 * @property {number} mrr Monthly Recurring Revenue in the site's currency
 **/
