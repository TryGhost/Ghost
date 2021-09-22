const DomainEvents = require('@tryghost/domain-events');
const {MemberEntryViewEvent} = require('@tryghost/member-events');

/**
 * @template Data
 * @typedef {object} IEvent
 * @prop {Date} timestamp
 * @prop {Data} data
 */

class EventsController {
    static createEvents(req, res) {
        try {
            const {events} = req.body;
            for (const event of events) {
                if (event.type === 'entry_view') {
                    const {entryId, entryUrl, memberId, memberStatus, createdAt} = event;
                    const entryEvent = new MemberEntryViewEvent({
                        entryId,
                        entryUrl,
                        memberId,
                        memberStatus
                    }, createdAt);
                    DomainEvents.dispatch(entryEvent);
                }
            }
            res.writeHead(201);
            return res.end('Created.');
        } catch (err) {
            const statusCode = (err && err.statusCode) || 500;
            res.writeHead(statusCode);
            return res.end('Internal Server Error.');
        }
    }
}

module.exports = EventsController;
