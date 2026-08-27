import Controller from '@ember/controller';
import MemberFetcher from 'ghost-admin/helpers/member-fetcher';
import {EMAIL_EVENTS, NEWSLETTER_EVENTS} from 'ghost-admin/helpers/members-event-filter';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {use} from 'ember-could-get-used-to-this';

export default class MembersActivityController extends Controller {
    @service router;
    @service settings;
    @service store;
    @service feature;

    queryParams = ['excludedEvents', 'member'];

    @tracked excludedEvents = null;
    @tracked member = null;

    @use memberRecord = new MemberFetcher(() => [this.member]);

    // we don't want to show or allow filtering of certain events in some situations
    // - no member selected = don't show email events, they flood the list and the API can't paginate correctly
    // - newsletter is disabled = don't show email or newletter events
    get hiddenEvents() {
        const hiddenEvents = [];

        if (!this.member) {
            hiddenEvents.push(...EMAIL_EVENTS);
        }
        hiddenEvents.push('aggregated_click_event');

        if (this.settings.editorDefaultEmailRecipients === 'disabled') {
            hiddenEvents.push(...EMAIL_EVENTS, ...NEWSLETTER_EVENTS);
        }

        return hiddenEvents;
    }

    get fullExcludedEvents() {
        return (this.excludedEvents || '').split(',').concat(this.hiddenEvents);
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
