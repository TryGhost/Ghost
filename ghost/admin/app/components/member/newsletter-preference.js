import Component from '@glimmer/component';
import moment from 'moment-timezone';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// todo: remove when backend will be ready
const getMockedData = (email) => {
    const timestamp = '2022-11-17T07:15:45.000Z';
    const mockSuppressedInfoSpam = {
        reason: 'spam',
        timestamp
    };

    const mockSuppressedInfoFail = {
        reason: 'fail',
        timestamp
    };

    const data = {
        emailSuppression: {
            suppressed: false,
            info: null
        }
    };

    if (email === 'spam@ghost.org') {
        data.emailSuppression = {
            suppressed: true,
            info: mockSuppressedInfoSpam
        };
    }

    if (email === 'fail@ghost.org') {
        data.emailSuppression = {
            suppressed: true,
            info: mockSuppressedInfoFail
        };
    }

    return data;
};

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

    get suppressionData() {
        // todo: replace `getMockedData(this.args.member.email)` on `this.args.member` when backend will be ready
        const {emailSuppression} = getMockedData(this.args.member.email);
        const timestamp = emailSuppression.info?.timestamp;
        const formattedDate = timestamp ? moment(new Date(timestamp)).format('D MMM YYYY') : null;

        return {
            suppressed: emailSuppression.suppressed,
            reason: emailSuppression.info?.reason,
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
}
