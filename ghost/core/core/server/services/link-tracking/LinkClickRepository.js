const {LinkClick} = require('@tryghost/link-tracking');
const ObjectID = require('bson-objectid').default;

module.exports = class LinkClickRepository {
    /** @type {Object} */
    #MemberLinkClickEventModel;

    /** @type {Object} */
    #MemberLinkClickEvent;

    /** @type {object} */
    #Member;

    /** @type {object} */
    #DomainEvents;

    /**
     * @param {object} deps
     * @param {object} deps.MemberLinkClickEventModel Bookshelf Model
     * @param {object} deps.Member Bookshelf Model
     * @param {object} deps.MemberLinkClickEvent Event
     * @param {object} deps.DomainEvents
     */
    constructor(deps) {
        this.#MemberLinkClickEventModel = deps.MemberLinkClickEventModel;
        this.#Member = deps.Member;
        this.#MemberLinkClickEvent = deps.MemberLinkClickEvent;
        this.#DomainEvents = deps.DomainEvents;
    }

    async getAll(options) {
        const collection = await this.#MemberLinkClickEventModel.findAll(options);

        const result = [];

        for (const model of collection.models) {
            const member = await this.#Member.findOne({id: model.get('member_id')});
            result.push(new LinkClick({
                link_id: model.get('redirect_id'),
                member_uuid: member.get('uuid')
            }));
        }

        return result;
    }

    /**
     * @param {LinkClick} linkClick
     * @returns {Promise<void>}
     */
    async save(linkClick) {
        // Convert uuid to id
        const member = await this.#Member.findOne({uuid: linkClick.member_uuid});
        if (!member) {
            return;
        }

        const model = await this.#MemberLinkClickEventModel.add({
            // Only store the pathname (no support for variable query strings)
            redirect_id: linkClick.link_id.toHexString(),
            member_id: member.id
        }, {});

        linkClick.event_id = ObjectID.createFromHexString(model.id);

        // Dispatch event
        this.#DomainEvents.dispatch(this.#MemberLinkClickEvent.create({memberId: member.id, memberLastSeenAt: member.get('last_seen_at'), linkId: linkClick.link_id.toHexString()}, new Date()));
    }
};
