import Component from '@glimmer/component';
import {action, get} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class MembersNewsletterPreference extends Component {
    @tracked filterValue;

    constructor(...args) {
        super(...args);
    }

    get newsletters() {
        if (this.args.newsletters?.length > 0) {
            return this.args.newsletters.map((d) => {
                return {
                    name: d.name,
                    description: d.description,
                    subscribed: !!this.args.member?.get('newsletters')?.find((n) => {
                        return n.id === d.id;
                    }),
                    id: d.id,
                    forId: `${d.id}-checkbox`
                };
            });
        }
        return [];
    }

    @action
    updateNewsletterPreference(newsletter, event) {
        let updatedNewsletters = [];

        const selectedNewsletter = this.args.newsletters.find((d) => {
            return d.id === newsletter.id;
        });

        // get() is required because member can be a proxy object when loaded
        // directly from the members list
        if (!event.target.checked) {
            updatedNewsletters = get(this.args.member, 'newsletters').filter((d) => {
                return d.id !== newsletter.id;
            });
        } else {
            updatedNewsletters = get(this.args.member, 'newsletters').filter((d) => {
                return d.id !== newsletter.id;
            }).concat(selectedNewsletter);
        }
        this.args.setMemberNewsletters(updatedNewsletters);
    }
}
