import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

class MemberActivity {
    eventProperties = {
        sent: {
            icon: 'send-email',
            iconClass: 'midgrey',
            tooltip: 'Received email'
        },
        opened: {
            icon: 'eye',
            iconClass: 'green-d2',
            tooltip: 'Opened email'
        },
        failed: {
            icon: 'cross-circle',
            iconClass: 'red-d2',
            tooltip: 'Email delivery failed'
        }
    }

    constructor(props) {
        Object.assign(this, props);
    }

    get icon() {
        return this.eventProperties[this.event].icon;
    }

    get iconClass() {
        return this.eventProperties[this.event].iconClass;
    }

    get tooltip() {
        return this.eventProperties[this.event].tooltip;
    }

    get message() {
        if (this.email) {
            return this.email.subject;
        }

        return this.eventProperties[this.event].message;
    }
}

export default class MemberActivityFeedComponent extends Component {
    @tracked emailPreview;
    @tracked isShowingAll = false;

    get activities() {
        const activities = [];

        (this.args.emailRecipients || []).forEach((emailRecipient) => {
            if (emailRecipient.openedAtUTC) {
                activities.push(new MemberActivity({
                    event: 'opened',
                    email: emailRecipient.email,
                    timestamp: emailRecipient.openedAtUTC,
                    action: this.openEmailPreview.bind(this, emailRecipient.email)
                }));
            } else if (emailRecipient.failedAtUTC) {
                activities.push(new MemberActivity({
                    event: 'failed',
                    email: emailRecipient.email,
                    timestamp: emailRecipient.failedAtUTC,
                    action: this.openEmailPreview.bind(this, emailRecipient.email)
                }));
            } else if (emailRecipient.processedAtUTC) {
                activities.push(new MemberActivity({
                    event: 'sent',
                    email: emailRecipient.email,
                    timestamp: emailRecipient.processedAtUTC,
                    action: this.openEmailPreview.bind(this, emailRecipient.email)
                }));
            }
        });

        return activities.sort((a, b) => {
            return b.timestamp.valueOf() - a.timestamp.valueOf();
        });
    }

    get firstActivities() {
        return this.activities.slice(0, 5);
    }

    get remainingActivities() {
        return this.activities.slice(5, this.activities.length);
    }

    @action
    showAll() {
        this.isShowingAll = true;
    }

    @action
    openEmailPreview(email) {
        this.emailPreview = email;
    }

    @action
    closeEmailPreview() {
        this.emailPreview = null;
    }
}
