const _ = require('lodash');
const papaparse = require('papaparse');
const DEFAULT_COLUMNS = [
    'id',
    'email',
    'name',
    'note',
    'subscribed_to_emails',
    'complimentary_plan',
    'expiry_at',
    'stripe_customer_id',
    'created_at',
    'deleted_at',
    'labels',
    'products'
];

const unparse = (members, columns = DEFAULT_COLUMNS.slice()) => {
    columns = columns.map((column) => {
        if (column === 'subscribed') {
            return 'subscribed_to_emails';
        }
        return column;
    });
    const mappedMembers = members.map((member) => {
        if (member.error) {
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
        let expiryAt;

        if (member.expiry_at) {
            expiryAt = member.expiry_at;
        }

        if (Array.isArray(member.tiers)) {
            tiers = member.tiers.map((tier) => {
                return tier.name;
            }).join(',');
            const tierWithExpiry = member.tiers.find((d) => {
                return !!d.expiry_at;
            });
            expiryAt = tierWithExpiry ? (new Date(tierWithExpiry.expiry_at)).toISOString() : expiryAt;
        }

        return {
            id: member.id,
            email: member.email,
            name: member.name,
            note: member.note,
            subscribed_to_emails: member.subscribed,
            complimentary_plan: member.comped || member.complimentary_plan,
            expiry_at: expiryAt,
            stripe_customer_id: _.get(member, 'subscriptions[0].customer.id') || member.stripe_customer_id,
            created_at: member.created_at,
            deleted_at: member.deleted_at,
            labels: labels,
            products: tiers,
            error: member.error || null
        };
    });

    return papaparse.unparse(mappedMembers, {
        columns
    });
};

module.exports = unparse;
