import Component from '@glimmer/component';

export default class GhMembersListItemColumnLabs extends Component {
    constructor(...args) {
        super(...args);
    }

    get labels() {
        const labelData = this.args.member.get('labels') || [];
        return labelData.map(label => label.name).join(', ');
    }

    get subscriptionStatus() {
        const subscriptions = this.args.member.get('subscriptions') || [];
        return subscriptions[0]?.status;
    }

    get billingPeriod() {
        const subscriptions = this.args.member.get('subscriptions') || [];
        const billingPeriod = subscriptions[0]?.price?.interval;
        return billingPeriod;
    }
}
