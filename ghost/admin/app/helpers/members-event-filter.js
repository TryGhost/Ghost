import Helper from '@ember/component/helper';
import classic from 'ember-classic-decorator';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';

export const EMAIL_EVENTS = ['email_delivered_event','email_opened_event','email_failed_event'];
export const NEWSLETTER_EVENTS = ['newsletter_event'];

@classic
export default class MembersEventFilter extends Helper {
    @service settings;

    compute(
        positionalParams,
        {excludedEvents = [], member = '', excludeEmailEvents = false}
    ) {
        const excludedEventsSet = new Set();

        if (this.settings.get('editorDefaultEmailRecipients') === 'disabled') {
            [...EMAIL_EVENTS, ...NEWSLETTER_EVENTS].forEach(type => excludedEventsSet.add(type));
        }

        if (excludeEmailEvents) {
            EMAIL_EVENTS.forEach(type => excludedEventsSet.add(type));
        }

        if (excludedEvents.length) {
            excludedEvents.forEach(type => excludedEventsSet.add(type));
        }

        let filterParts = [];

        const excludedEventsArray = Array.from(excludedEventsSet).reject(isBlank);
        if (excludedEventsArray.length > 0) {
            filterParts.push(`type:-[${excludedEventsArray.join(',')}]`);
        }

        if (member) {
            filterParts.push(`data.member_id:${member}`);
        }

        return filterParts.join('+');
    }
}
