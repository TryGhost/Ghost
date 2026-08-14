import moment from 'moment-timezone';
import {AVAILABLE_EVENTS} from 'ghost-admin/helpers/event-name';
import {Factory} from 'miragejs';

export default Factory.extend({
    name(i) { return `Integration ${i + 1}`;},
    event(i) {
        let event = AVAILABLE_EVENTS[i % 3];
        return event.event;
    },
    target(i) { return `https://example.com/${i + 1}`; },
    lastTriggeredAt: null,

    createdAt() { return moment.utc().format(); },
    updatedAt() { return moment.utc().format(); }
});
