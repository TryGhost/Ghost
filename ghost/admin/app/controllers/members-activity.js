import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class MembersActivityController extends Controller {
    @service router;

    queryParams = ['excludedEvents'];

    @tracked excludedEvents = null;

    get filter() {
        let excludedEvents = this.member ?
            new Set() :
            new Set(['email_opened_event', 'email_delivered_event', 'email_failed_event']);

        (this.excludedEvents || '').split(',').forEach(event => event && excludedEvents.add(event));

        if (excludedEvents.size > 0) {
            return `type:-[${Array.from(excludedEvents).join(',')}]`;
        } else {
            return '';
        }
    }

    @action
    updateExcludedEvents(newList) {
        this.router.transitionTo({queryParams: {excludedEvents: newList}});
    }
}
