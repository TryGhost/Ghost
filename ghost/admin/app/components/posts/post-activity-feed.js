import Component from '@glimmer/component';
import {action} from '@ember/object';

const allEvents = [
    'comment_event',
    'click_event',
    'signup_event',
    'subscription_event',
    'email_delivered_event',
    'email_opened_event',
    'email_failed_event',
    'feedback_event'
];

const eventTypes = {
    sent: ['email_delivered_event'],
    opened: ['email_opened_event'],
    clicked: ['click_event'],
    feedback: ['feedback_event'],
    conversion: ['subscription_event', 'signup_event']
};

export default class PostActivityFeed extends Component {
    _pageSize = 5;

    get getEventTypes() {
        const filteredEvents = eventTypes[this.args.eventType];
        return allEvents.filter(event => !filteredEvents.includes(event));
    }

    get pageSize() {
        return this._pageSize;
    }

    // calculate amount of empty rows which require to keep table height the same for each tab/page
    @action
    getAmountOfStubs({data}) {
        const stubs = this._pageSize - data.length;

        return new Array(stubs).fill(1);
    }

    @action
    isPreviousButtonDisabled({hasReachedStart, isLoading}) {
        return hasReachedStart || isLoading;
    }

    @action
    isNextButtonDisabled({hasReachedEnd, isLoading}) {
        return hasReachedEnd || isLoading;
    }
}
