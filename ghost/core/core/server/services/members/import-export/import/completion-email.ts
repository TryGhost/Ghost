import {serialize} from '../csv';
import {isCustomFieldColumn} from '@tryghost/custom-field-types/csv';
import type {MemberImportRow, ImportErrorRow, ImportLabel, Label} from './row';

const emailTemplate = require('./email-template');

// The finished import as the email reads it: how many imported and which rows
// failed. Structural, so the importer's richer result satisfies it directly.
interface ImportSummary {
    imported: number;
    errors: ImportErrorRow[];
}

interface CompletionEmailInput {
    result: ImportSummary;
    recipient: string;
    labelName: string;
    importLabel: ImportLabel | null;
    urlFor: (type: string, data: unknown, absolute: boolean) => string;
}

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    forceTextContent: boolean;
    attachments: Array<{
        filename: string;
        content: string;
        contentType: string;
        contentDisposition: string;
    }>;
}

// Turn an ORM validation error into copy a member manager can act on. Presentation
// only: the API response keeps the raw messages, and just the emailed report is
// rewritten. Takes one reason at a time, so a rewrite matching to the end of its input
// cannot consume the reason after it.
function humaniseReason(message: string): string {
    return message
        .replace('Value in [members.email] cannot be blank.', 'Missing email address')
        .replace('Value in [members.note] exceeds maximum length of 2000 characters.', '"Note" exceeds maximum length of 2000 characters')
        .replace('Value in [members.subscribed] must be one of true, false, 0 or 1.', 'Value in "Subscribed to emails" must be "true" or "false"')
        .replace('Validation (isEmail) failed for email', 'Invalid email address')
        .replace(/No such customer:[\s\S]*/, 'Could not find Stripe customer');
}

function humaniseError(row: ImportErrorRow): string {
    return row.errors.map(humaniseReason).join('\n');
}

// One row of the fixed, member-vocabulary part of the error report, in emit order.
// papaparse takes the fixed columns from these keys, so the report cannot drift from the
// shaper -- a new member column must be added here or the shaper stops compiling. tiers
// and deleted_at are export-vocabulary columns an import never fills; kept always-empty
// so the report matches the members export CSV. Any custom_fields.* columns a submitted
// row carried are dynamic, so they are threaded in separately by buildErrorReport.
type ErrorReportRow = {
    id: MemberImportRow['id'];
    email: MemberImportRow['email'];
    name: MemberImportRow['name'];
    note: MemberImportRow['note'];
    subscribed_to_emails: MemberImportRow['subscribed'];
    complimentary_plan: MemberImportRow['complimentary_plan'];
    stripe_customer_id: MemberImportRow['stripe_customer_id'];
    created_at: MemberImportRow['created_at'];
    deleted_at: undefined;
    labels: string;
    tiers: '';
    gift_id: string | null;
    error: string;
};

function stringifyLabels(labels: Array<string | Label>): string {
    return labels.map(label => (typeof label === 'string' ? label : label.name)).join(',');
}

// The custom_fields.* cells a submitted row carried, echoed untouched so a manager can
// fix a failed row and re-upload the values they mapped.
function customFieldCells(row: ImportErrorRow): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).filter(([column]) => isCustomFieldColumn(column)));
}

// Shape a failed import row into its fixed error-report cells, with the raw ORM message
// rewritten into copy the member manager can act on. Custom field cells are merged on by
// buildErrorReport, which owns the dynamic column set.
function toErrorReportRow(row: ImportErrorRow): ErrorReportRow {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        note: row.note,
        subscribed_to_emails: row.subscribed,
        complimentary_plan: row.complimentary_plan,
        stripe_customer_id: row.stripe_customer_id,
        created_at: row.created_at,
        deleted_at: undefined,
        labels: stringifyLabels(row.labels),
        tiers: '',
        gift_id: row.gift_id || null,
        error: humaniseError(row)
    };
}

// The error report attached to the completion email: the failed rows as CSV. It shares
// the serialiser with the export but not the shaping -- the export writes db members,
// this echoes submitted rows. Member columns come from the shaper's keys (so the type
// stays the single source); the custom_fields.* columns across the rows are threaded in
// before the last error column, and each row's custom cells merged on.
function buildErrorReport(errors: ImportErrorRow[]): string {
    if (errors.length === 0) {
        return serialize([]);
    }
    const memberColumns = Object.keys(toErrorReportRow(errors[0])).filter(column => column !== 'error');
    const customColumns = [...new Set(errors.flatMap(row => Object.keys(customFieldCells(row))))];
    const columns = [...memberColumns, ...customColumns, 'error'];
    const rows = errors.map(row => ({...toErrorReportRow(row), ...customFieldCells(row)}));
    return serialize(rows, {columns});
}

// Compose the completion email for a finished import: the summary and its links,
// plus the attached error report. Owns how the outcome is presented, so the
// importer yields only the result and never touches email or CSV formatting.
export default function buildCompletionEmail({result, recipient, labelName, importLabel, urlFor}: CompletionEmailInput): EmailPayload {
    const siteUrl = new URL(urlFor('home', null, true));
    const membersUrl = new URL('members', urlFor('admin', null, true));
    if (importLabel) {
        membersUrl.searchParams.set('label', importLabel.slug);
    }

    const html = emailTemplate({result, siteUrl, membersUrl, emailRecipient: recipient, importLabel});
    const subject = result.imported > 0 ? 'Your member import is complete' : 'Your member import was unsuccessful';

    return {
        to: recipient,
        subject,
        html,
        forceTextContent: true,
        attachments: [{
            filename: `${labelName} - Errors.csv`,
            content: buildErrorReport(result.errors),
            contentType: 'text/csv',
            contentDisposition: 'attachment'
        }]
    };
}
