import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class MembersNewsletterPreference extends Component {
    @service ajax;
    @service notifications;
    @service ghostPaths;
    @service store;

    @tracked filterValue;
    @tracked isReEnabling = false;

    constructor(...args) {
        super(...args);
    }

    get newsletters() {
        if (this.args.newsletters?.length > 0) {
            return this.args.newsletters.map((d) => {
                return {
                    name: d.name,
                    description: d.description,
                    subscribed: !!this.args.member?.newsletters?.find((n) => {
                        return n.id === d.id;
                    }),
                    id: d.id,
                    forId: `${d.id}-checkbox`
                };
            });
        }
        return [];
    }

    get suppressionData() {
        const {emailSuppression} = this.args.member;
        const timestamp = emailSuppression?.info?.timestamp;
        const formattedDate = timestamp ? moment(new Date(timestamp)).format('D MMM YYYY') : null;

        return {
            suppressed: emailSuppression?.suppressed,
            reason: emailSuppression?.info?.reason,
            date: formattedDate
        };
    }

    @action
    updateNewsletterPreference(newsletter, event) {
        let updatedNewsletters = [];

        const selectedNewsletter = this.args.newsletters.find((d) => {
            return d.id === newsletter.id;
        });

        if (!event.target.checked) {
            updatedNewsletters = this.args.member.newsletters.filter((d) => {
                return d.id !== newsletter.id;
            });
        } else {
            updatedNewsletters = this.args.member.newsletters.filter((d) => {
                return d.id !== newsletter.id;
            }).concat(selectedNewsletter);
        }
        this.args.setMemberNewsletters(updatedNewsletters);
    }

    @action
    async reEnableEmail() {
        this.isReEnabling = true;

        try {
            const url = `${this.ghostPaths.url.api('members', this.args.member.id)}suppression`;
            await this.ajax.delete(url);

            // Refresh the member data to get updated suppression status
            await this.store.findRecord('member', this.args.member.id, {
                reload: true,
                include: 'tiers'
            });

            this.notifications.showNotification('Email re-enabled successfully', {
                type: 'success'
            });
        } catch (error) {
            this.notifications.showAlert('Failed to re-enable email. Please try again.', {
                type: 'error'
            });
        } finally {
            this.isReEnabling = false;
        }
    }
}
