import Component from '@glimmer/component';
import {action} from '@ember/object';
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
}
