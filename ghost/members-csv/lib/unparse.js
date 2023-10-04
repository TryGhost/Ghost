const _ = require('lodash');
const papaparse = require('papaparse');
const DEFAULT_COLUMNS = [
    'id',
    'email',
    'name',
    'note',
    'subscribed_to_emails',
    'complimentary_plan',
    'stripe_customer_id',
    'created_at',
    'deleted_at',
    'labels',
    'tiers'
];

const unparse = (members, columns = DEFAULT_COLUMNS.slice()) => {
    columns = columns.map((column) => {
        if (column === 'subscribed') {
            return 'subscribed_to_emails';
        }
        return column;
    });
    const mappedMembers = members.map((member) => {
        if (member.error && !columns.includes('error')) {
            columns.push('error');
        }

        let labels = '';
        if (typeof member.labels === 'string') {
            labels = member.labels;
        } else if (Array.isArray(member.labels)) {
            labels = member.labels.map((l) => {
                return typeof l === 'string' ? l : l.name;
            }).join(',');
        }

        let tiers = '';

        if (Array.isArray(member.tiers)) {
            tiers = member.tiers.map((tier) => {
                return tier.name;
            }).join(',');
        }

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed_to_emails: member.subscribed || member.subscribed_to_emails ? true : false,
            complimentary_plan: member.comped || member.complimentary_plan,
            stripe_customer_id: _.get(member, 'subscriptions[0].customer.id') || member.stripe_customer_id,
            created_at: member.created_at,
            deleted_at: member.deleted_at,
            labels: labels,
            tiers: tiers,
            import_tier: member.import_tier || null,
            error: member.error || null
        };
    });

    return papaparse.unparse(mappedMembers, {
        columns
    });
};

module.exports = unparse;
