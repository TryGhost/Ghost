import Controller from '@ember/controller';
import {EMAIL_EVENTS, NEWSLETTER_EVENTS} from 'ghost-admin/helpers/members-event-filter';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class MembersActivityController extends Controller {
    @service router;
    @service settings;
    @service store;

    queryParams = ['excludedEvents', 'member'];

    @tracked excludedEvents = null;
    @tracked member = null;

    // we don't want to show or allow filtering of certain events in some situations
    // - no member selected = don't show email events, they flood the list and the API can't paginate correctly
    // - newsletter is disabled = don't show email or newletter events
    get hiddenEvents() {
        const hiddenEvents = [];

        if (!this.member) {
            hiddenEvents.push(...EMAIL_EVENTS);
        }

        if (this.settings.get('editorDefaultEmailRecipients') === 'disabled') {
            hiddenEvents.push(...EMAIL_EVENTS, ...NEWSLETTER_EVENTS);
        }

        return hiddenEvents;
    }

    get fullExcludedEvents() {
        return (this.excludedEvents || '').split(',').concat(this.hiddenEvents);
    }

    get memberRecord() {
        if (!this.member) {
            return null;
        }

        // TODO: {reload: true} here shouldn't be needed but without it
        // the template renders nothing if the record is already in the store
        return this.store.findRecord('member', this.member, {reload: true});
    }

    @action
    changeExcludedEvents(newList) {
        this.router.transitionTo({queryParams: {excludedEvents: newList}});
    }

    @action
    changeMember(member) {
        this.router.transitionTo({queryParams: {member: member?.id}});
    }
}
