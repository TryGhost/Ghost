/**
 * @typedef {import('knex').Knex.Client} KnexClient
 */

/**
 * @typedef {import('@sentry/types').Integration} SentryIntegration
 */

/**
 * Sentry Knex tracing integration
 *
 * @implements {SentryIntegration}
 */
class SentryKnexTracingIntegration {
    static id = 'Knex';

    name = SentryKnexTracingIntegration.id;

    /** @type {KnexClient} */
    #knex;

    /** @type {Map} */
    #spanCache = new Map();

    /**
     * @param {KnexClient} knex
     */
    constructor(knex) {
        this.#knex = knex;
    }

    /**
     * @param {Function} addGlobalEventProcessor
     * @param {Function} getCurrentHub
     */
    setupOnce(addGlobalEventProcessor, getCurrentHub) {
        this.#knex.on('query', (query) => {
            const scope = getCurrentHub().getScope();
            const parentSpan = scope?.getSpan();

            const span = parentSpan?.startChild({
                op: 'db.query',
                description: query.sql
            });

            if (span) {
                this.#spanCache.set(query.__knexQueryUid, span);
            }
        });

        const handleQueryExecuted = (err, query) => {
            const queryId = query.__knexQueryUid;
            const span = this.#spanCache.get(queryId);

            if (span) {
                span.finish();

                this.#spanCache.delete(queryId);
            }
        };

        this.#knex.on('query-response', handleQueryExecuted);
        this.#knex.on('query-error', handleQueryExecuted);
    }
}

module.exports = SentryKnexTracingIntegration;
