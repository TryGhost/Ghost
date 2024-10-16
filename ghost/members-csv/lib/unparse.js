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

const unparse = (rows, columns = DEFAULT_COLUMNS.slice()) => {
    columns = columns.map((column) => {
        if (column === 'subscribed') {
            return 'subscribed_to_emails';
        }
        return column;
    });
    const mappedRows = rows.map((row) => {
        if (row.error && !columns.includes('error')) {
            columns.push('error');
        }

        let labels = '';
        if (typeof row.labels === 'string') {
            labels = row.labels;
        } else if (Array.isArray(row.labels)) {
            labels = row.labels.map((l) => {
                return typeof l === 'string' ? l : l.name;
            }).join(',');
        }

        let tiers = '';

        if (Array.isArray(row.tiers)) {
            tiers = row.tiers.map((tier) => {
                return tier.name;
            }).join(',');
        }

        return {
            id: row.id,
            email: row.email,
            name: row.name,
            note: row.note,
            subscribed_to_emails: 'subscribed' in row ? row.subscribed : row.subscribed_to_emails,
            complimentary_plan: row.comped || row.complimentary_plan,
            stripe_customer_id: _.get(row, 'subscriptions[0].customer.id') || row.stripe_customer_id,
            created_at: row.created_at,
            deleted_at: row.deleted_at,
            labels: labels,
            tiers: tiers,
            import_tier: row.import_tier || null,
            error: row.error || null
        };
    });

    return papaparse.unparse(mappedRows, {
        escapeFormulae: true,
        columns
    });
};

module.exports = unparse;
