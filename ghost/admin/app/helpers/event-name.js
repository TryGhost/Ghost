import {helper} from '@ember/component/helper';

export const AVAILABLE_EVENTS = [
    {event: 'site.changed', name: 'Site Changed (rebuild)'},
    {event: 'subscriber.added', name: 'Subscriber Added'},
    {event: 'subscriber.deleted', name: 'Subscriber Deleted'}
];

export function eventName([event]/*, hash*/) {
    let match = AVAILABLE_EVENTS.findBy('event', event);

    return match ? match.name : event;
}

export default helper(eventName);
