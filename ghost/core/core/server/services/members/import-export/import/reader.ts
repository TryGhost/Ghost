import {parse as parseCSV} from '../csv';
import {memberImportRowSchema, type MemberImportRow} from './row';

// Each accepted CSV header (the key) maps to the member field it fills (the value):
// a "subscribed_to_emails" column fills the "subscribed" field, and so on.
const FIELD_BY_HEADER: Record<string, string> = {
    email: 'email',
    name: 'name',
    note: 'note',
    subscribed_to_emails: 'subscribed',
    created_at: 'created_at',
    complimentary_plan: 'complimentary_plan',
    stripe_customer_id: 'stripe_customer_id',
    labels: 'labels',
    import_tier: 'import_tier',
    gift_id: 'gift_id'
};

// Resolve a caller mapping's target to the member field it fills. The target is usually
// a field already, but a caller may name a default header (e.g. "subscribed_to_emails"),
// which resolves to its field. hasOwn keeps a prototype name from matching a method.
function toMemberField(target: string): string {
    return Object.hasOwn(FIELD_BY_HEADER, target) ? FIELD_BY_HEADER[target] : target;
}

export default async function readMemberRows(path: string, mapping?: Record<string, string>): Promise<MemberImportRow[]> {
    const headerToField: Record<string, string> = mapping
        ? Object.fromEntries(Object.entries(mapping).map(([header, target]): [string, string] => [header, toMemberField(target)]))
        : FIELD_BY_HEADER;

    const rows = await parseCSV(path, headerToField);
    return rows.map(row => memberImportRowSchema.parse(row));
}
