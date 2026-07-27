import {serialize} from '../csv';
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
// rewritten.
function humaniseError(message: string): string {
    return message
        .replace('Value in [members.email] cannot be blank.', 'Missing email address')
        .replace('Value in [members.note] exceeds maximum length of 2000 characters.', '"Note" exceeds maximum length of 2000 characters')
        .replace('Value in [members.subscribed] must be one of true, false, 0 or 1.', 'Value in "Subscribed to emails" must be "true" or "false"')
        .replace('Validation (isEmail) failed for email', 'Invalid email address')
        .replace(/No such customer:[^,]*/, 'Could not find Stripe customer');
}

// One row of the attached error report, in emit order. papaparse takes the columns from
// these keys, so the report cannot drift from the shaper -- a new column must be added
// here or the shaper stops compiling. tiers and deleted_at are export-vocabulary columns
// an import never fills; kept always-empty so the report matches the members export CSV.
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
        error: humaniseError(row.error)
    };
}

// The error report attached to the completion email: the failed rows as CSV. No column
// list is passed -- the typed ErrorReportRow defines the columns.
function buildErrorReport(errors: ImportErrorRow[]): string {
    return serialize(errors.map(toErrorReportRow));
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
