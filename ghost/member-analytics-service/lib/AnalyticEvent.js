const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const ObjectID = require('bson-objectid').default;

const messages = {
    missingMemberId: 'A memberId must be provided for analytic events',
    invalidEventName: 'Analytic events must be provided a "name"',
    missingSourceUrl: 'A sourceUrl must be provided for analytic events',
    invalidMemberStatus: 'A memberStatus of either "free", "paid" or "comped" must be provided'
};

/**
 * @typedef {object} AnalyticEventProps
 * @prop {ObjectID} id
 * @prop {string} name
 * @prop {Date} timestamp
 * @prop {ObjectID} memberId
 * @prop {'free'|'comped'|'paid'} memberStatus
 * @prop {ObjectID | null} entryId
 * @prop {string} sourceUrl
 * @prop {string | null} metadata
*/
class AnalyticEvent {
    get id() {
        return this.props.id.toHexString();
    }
    get name() {
        return this.props.name;
    }
    get timestamp() {
        return this.props.timestamp;
    }
    get memberId() {
        return this.props.memberId.toHexString();
    }
    get memberStatus() {
        return this.props.memberStatus;
    }
    get entryId() {
        return this.props.entryId.toHexString();
    }
    get sourceUrl() {
        return this.props.sourceUrl;
    }
    get metadata() {
        return this.props.metadata;
    }
    get isNew() {
        return !!this.options.isNew;
    }

    /**
     * @param {AnalyticEventProps} props
     * @param {object} options
     * @param {boolean} options.isNew
     */
    constructor(props, options) {
        this.props = props;
        this.options = options;
    }

    /**
     * @param {object} data
     * @param {ObjectID | string} [data.id]
     * @param {ObjectID | string} [data.entryId]
     * @param {string} [data.metadata]
     * @param {ObjectID | string} data.memberId
     * @param {string} data.sourceUrl
     * @param {string} data.name
     * @param {string} data.memberStatus
     * @param {Date} [data.timestamp]
     */
    static create(data) {
        let isNew = false;
        let id;
        if (data.id instanceof ObjectID) {
            id = data.id;
        } else if (typeof data.id === 'string') {
            id = new ObjectID(data.id);
        } else {
            id = new ObjectID();
            isNew = true;
        }

        let memberId;
        if (data.memberId instanceof ObjectID) {
            memberId = data.memberId;
        } else if (typeof data.memberId === 'string') {
            memberId = new ObjectID(data.memberId);
        } else {
            throw new errors.IncorrectUsageError(tpl(messages.missingMemberId));
        }

        let entryId;
        if (data.entryId instanceof ObjectID) {
            entryId = data.entryId;
        } else if (typeof data.entryId === 'string') {
            entryId = new ObjectID(data.entryId);
        } else {
            entryId = null;
        }

        const name = data.name;
        if (typeof name !== 'string') {
            throw new errors.IncorrectUsageError(tpl(messages.invalidEventName));
        }

        const timestamp = data.timestamp || new Date();

        const sourceUrl = data.sourceUrl;
        if (!sourceUrl) {
            throw new errors.IncorrectUsageError(tpl(messages.missingSourceUrl));
        }

        const memberStatus = data.memberStatus;
        if (memberStatus !== 'free' && memberStatus !== 'paid' && memberStatus !== 'comped') {
            throw new errors.IncorrectUsageError(tpl(messages.invalidMemberStatus));
        }

        const metadata = data.metadata || null;

        return new AnalyticEvent({
            id,
            name,
            timestamp,
            memberId,
            memberStatus,
            entryId,
            sourceUrl,
            metadata
        }, {
            isNew
        });
    }
}

module.exports = AnalyticEvent;
