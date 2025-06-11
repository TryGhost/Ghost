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
            map.set(row.referrer_source, {
                source: row.referrer_source,
                signups: row.total,
                paid_conversions: 0
            });
        }

        for (const row of conversionRows) {
            const existing = map.get(row.referrer_source) ?? {
                source: row.referrer_source,
                signups: 0,
                paid_conversions: 0
            };
            existing.paid_conversions = row.total;
            map.set(row.referrer_source, existing);
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
     * Return a list of all the attribution sources with date range filtering, including MRR data
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     * @returns {Promise<{data: AttributionCountStatWithMrr[], meta: {}}>}
     */
    async getReferrersHistoryWithRange(startDate, endDate) {
        const paidConversionEntries = await this.fetchPaidConversionSourcesWithRange(startDate, endDate);
        const signupEntries = await this.fetchSignupSourcesWithRange(startDate, endDate);
        const mrrEntries = await this.fetchMrrSourcesWithRange(startDate, endDate);

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
            } else {
                allEntries.push({
                    ...entry,
                    signups: 0,
                    mrr: 0,
                    date: entryDate
                });
            }
        });

        mrrEntries.forEach((entry) => {
            const entryDate = moment(entry.date).format('YYYY-MM-DD');
            const existingEntry = allEntries.find(e => e.source === entry.source && e.date === entryDate);

            if (existingEntry) {
                existingEntry.mrr = entry.mrr;
            } else {
                allEntries.push({
                    ...entry,
                    signups: 0,
                    paid_conversions: 0,
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
}

module.exports = ReferrersStatsService;

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
