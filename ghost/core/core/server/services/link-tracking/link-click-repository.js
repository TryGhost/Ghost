const LinkClick = require('./click-event');
const ObjectID = require('bson-objectid').default;
const sentry = require('../../../shared/sentry');
const config = require('../../../shared/config');
const _ = require('lodash');

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

        // Memoize the findOne function
        this.memoizedFindOne = _.memoize(async (uuid, options) => {
            return await this.#Member.findOne({uuid}, options);
        });
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
     * @param {object} [options]
     * @param {object} [options.transacting]
     * @returns {Promise<string | undefined>}
     */
    async save(linkClick, options = {}) {
        let member;
        const memberLookupOptions = options.transacting ? {transacting: options.transacting} : undefined;

        if (config && config.get('linkClickTrackingCacheMemberUuid')) {
            member = await this.memoizedFindOne(linkClick.member_uuid, memberLookupOptions);
        } else {
            member = await this.#Member.findOne({uuid: linkClick.member_uuid}, memberLookupOptions);
        }

        if (!member) {
            if (config.get('bulkEmail:captureLinkClickBadMemberUuid')) {
                sentry.captureMessage('LinkClickTrackingService > Member not found', {extra: {member_uuid: linkClick.member_uuid}});
            }
            return;
        }

        const model = await this.#MemberLinkClickEventModel.add({
            // Only store the pathname (no support for variable query strings)
            redirect_id: linkClick.link_id.toHexString(),
            member_id: member.id
        }, options);

        linkClick.event_id = ObjectID.createFromHexString(model.id);
        const timestamp = linkClick.timestamp ?? new Date();

        const event = this.#MemberLinkClickEvent.create({
            memberId: member.id,
            memberLastSeenAt: member.get('last_seen_at'),
            linkId: linkClick.link_id.toHexString()
        }, timestamp);

        if (options.transacting) {
            options.transacting.executionPromise.then(() => {
                try {
                    this.#DomainEvents.dispatch(event);
                } catch (error) {
                    sentry.captureException(error);
                }
            }, () => undefined);
        } else {
            this.#DomainEvents.dispatch(event);
        }

        return member.id;
    }
};
