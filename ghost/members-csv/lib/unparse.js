const _ = require('lodash');
const papaparse = require('papaparse');

const unparse = (members) => {
    const columns = new Set([
        'id',
        'email',
        'name',
        'note',
        'subscribed_to_emails',
        'complimentary_plan',
        'stripe_customer_id',
        'created_at',
        'deleted_at',
        'labels'
    ]);
    const mappedMembers = members.map((member) => {
        if (member.error) {
            columns.add('error');
        }

        let labels = '';
        if (typeof member.labels === 'string') {
            labels = member.labels;
        } else if (Array.isArray(member.labels)) {
            labels = member.labels.map((l) => {
                return typeof l === 'string' ? l : l.name;
            }).join(',');
        }

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed_to_emails: member.subscribed,
            complimentary_plan: member.comped || member.complimentary_plan,
            stripe_customer_id: _.get(member, 'subscriptions[0].customer.id') || member.stripe_customer_id,
            created_at: member.created_at,
            deleted_at: member.deleted_at,
            labels: labels,
            error: member.error || null
        };
    });

    return papaparse.unparse(mappedMembers, {
        columns: Array.from(columns.values())
    });
};

module.exports = unparse;
