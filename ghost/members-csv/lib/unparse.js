const _ = require('lodash');
const papaparse = require('papaparse');

const unparse = (members) => {
    const mappedMembers = members.map((member) => {
        let stripeCustomerId;

        if (member.stripe) {
            stripeCustomerId = _.get(member, 'stripe.subscriptions[0].customer.id');
        }
        let labels = [];
        if (member.labels) {
            labels = `${member.labels.map(l => l.name).join(',')}`;
        }

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed_to_emails: member.subscribed,
            complimentary_plan: member.comped,
            stripe_customer_id: stripeCustomerId,
            created_at: member.created_at,
            deleted_at: member.deleted_at,
            labels: labels
        };
    });

    return papaparse.unparse(mappedMembers);
};

module.exports = unparse;
