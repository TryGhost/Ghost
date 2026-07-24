import {serialize} from '../csv';
import {isCustomFieldColumn} from '@tryghost/custom-field-types/csv';
import type {ImportErrorRow, ImportLabel, Label} from './row';

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
// rewritten.
function humaniseError(message: string): string {
    return message
        .replace('Value in [members.email] cannot be blank.', 'Missing email address')
        .replace('Value in [members.note] exceeds maximum length of 2000 characters.', '"Note" exceeds maximum length of 2000 characters')
        .replace('Value in [members.subscribed] must be one of true, false, 0 or 1.', 'Value in "Subscribed to emails" must be "true" or "false"')
        .replace('Validation (isEmail) failed for email', 'Invalid email address')
        .replace(/No such customer:[^,]*/, 'Could not find Stripe customer');
}

// The member-vocabulary columns of the attached error report. Import-shaped by design:
// a member manager reads it to fix the failed rows and re-upload them, so it echoes the
// fields an import carries, not the ones the export writes. The error column is always
// last -- it is the report's reason for being -- and any custom_fields.* columns the
// submitted rows carried are threaded in just before it (see buildErrorReport).
const ERROR_REPORT_MEMBER_COLUMNS = ['id', 'email', 'name', 'note', 'subscribed_to_emails', 'complimentary_plan', 'stripe_customer_id', 'created_at', 'deleted_at', 'labels', 'tiers', 'gift_id'];

function stringifyLabels(labels: Array<string | Label>): string {
    return labels.map(label => (typeof label === 'string' ? label : label.name)).join(',');
}

// The custom_fields.* cells a submitted row carried, passed through untouched so the
// error report a manager fixes and re-uploads still holds the values they mapped. The
// import never gives these member meaning, so they are echoed exactly as received.
function customFieldCells(row: ImportErrorRow): Record<string, unknown> {
    return Object.fromEntries(Object.entries(row).filter(([column]) => isCustomFieldColumn(column)));
}

// Shape a failed import row into its error-report cells: the row as submitted, with the
// raw ORM message rewritten into copy the member manager can act on.
function toErrorReportRow(row: ImportErrorRow) {
    return {
        id: row.id,
        email: row.email,
        name: row.name,
        note: row.note,
        subscribed_to_emails: row.subscribed,
        complimentary_plan: row.complimentary_plan,
        stripe_customer_id: row.stripe_customer_id,
        created_at: row.created_at,
        deleted_at: row.deleted_at,
        labels: stringifyLabels(row.labels),
        gift_id: row.gift_id || null,
        ...customFieldCells(row),
        error: humaniseError(row.error)
    };
}

// The error report attached to the completion email: each failed row shaped into cells
// and serialised to CSV. It shares the CSV serialiser with the export but not the
// shaping -- the export writes database members, this echoes the rows a member
// submitted, so the two shapers are deliberately separate.
//
// The column set is fixed rather than inferred so the member columns keep their order
// and the error column stays last, but the fixed set would drop the custom_fields.*
// columns a row carried. So the custom field columns present across the failed rows are
// collected (first-seen order) and threaded in before the error column, and papaparse
// fills a missing cell as empty for any row that lacked one.
function buildErrorReport(errors: ImportErrorRow[]): string {
    const customColumns = [...new Set(errors.flatMap(row => Object.keys(customFieldCells(row))))];
    const columns = [...ERROR_REPORT_MEMBER_COLUMNS, ...customColumns, 'error'];
    return serialize(errors.map(toErrorReportRow), {columns});
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
