import papaparse from 'papaparse';
import type {MemberCsvRow} from './types';

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
    'tiers',
    'gift_id'
];

interface UnparseOptions {
    // Prefixes a leading =, +, -, @ or tab with an apostrophe so a spreadsheet does
    // not read the value as a formula. On by default: it belongs on any CSV a person
    // opens. The importer's own intermediate file is not one, and turns it off, so a
    // member named "-5" is not read back as "'-5".
    escapeFormulae?: boolean;
}

export default function unparse(rows: MemberCsvRow[], columns: string[] = DEFAULT_COLUMNS, {escapeFormulae = true}: UnparseOptions = {}): string {
    const outputColumns = columns.map((column) => {
        if (column === 'subscribed') {
            return 'subscribed_to_emails';
        }
        return column;
    });

    if (!outputColumns.includes('error') && rows.some(row => row.error)) {
        outputColumns.push('error');
    }

    const mappedRows = rows.map((row) => {
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
            stripe_customer_id: row.subscriptions?.[0]?.customer?.id || row.stripe_customer_id,
            created_at: row.created_at,
            deleted_at: row.deleted_at,
            labels,
            tiers,
            import_tier: row.import_tier || null,
            gift_id: row.gift_id || null,
            error: row.error || null
        };
    });

    return papaparse.unparse(mappedRows, {
        escapeFormulae,
        columns: outputColumns
    });
}
