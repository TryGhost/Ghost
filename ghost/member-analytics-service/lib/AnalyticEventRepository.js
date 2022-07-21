/**
 * @typedef {object} DBProps
 * @param {string} id
 * @param {string} event_name
 * @param {Date} created_at
 * @param {string} member_id
 * @param {string} member_status
 * @param {string} entry_id
 * @param {string} source_url
 * @param {string} metadata
 */

class AnalyticEventRepository {
    /**
     * @param {any} AnalyticEventModel
     */
    constructor(AnalyticEventModel) {
        /** @private */
        this.AnalyticEventModel = AnalyticEventModel;
    }

    /**
     * @param {import('./AnalyticEvent')} event
     */
    async save(event) {
        const data = {
            id: event.id,
            event_name: event.name,
            created_at: event.timestamp,
            member_id: event.memberId,
            member_status: event.memberStatus,
            entry_id: event.entryId,
            source_url: event.sourceUrl,
            metadata: event.metadata
        };

        const model = this.AnalyticEventModel.forge(data);

        if (event.isNew) {
            await model.save(null, {method: 'insert'});
        } else {
            await model.save(null, {method: 'update'});
        }
    }
}

module.exports = AnalyticEventRepository;
