import {serialize} from '../csv';
import renderImportEmail, {headingFor, type ImportEmailSummary} from './email-template';
import {isCustomFieldColumn} from '@tryghost/custom-field-types/csv';
import type {MemberImportRow, ImportErrorRow, ImportLabel, Label} from './row';

// The finished import as the email reads it: how many imported and which rows
// failed. Structural, so the importer's richer result satisfies it directly.
interface ImportSummary {
    imported: number;
    errors: ImportErrorRow[];
    importLabel?: ImportLabel;
}

export interface EmailLinks {
    siteUrl(): URL;
    membersUrl(labelSlug?: string): URL;
}

// A null result is an import that never produced one. It stopped before writing anything,
// which by then can only be our doing: the file was parsed and mapped inside the request.
interface ImportEmailInput {
    result: ImportSummary | null;
    recipient: string;
    labelName: string;
    links: EmailLinks;
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

// The error report attached to the completion email: the failed rows as CSV, called only
// when there are rows to list. It shares the serialiser with the export but not the
// shaping -- the export writes db members, this echoes submitted rows. Member columns come from the shaper's keys (so the type
// stays the single source); the custom_fields.* columns across the rows are threaded in
// before the last error column, and each row's custom cells merged on.
function buildErrorReport(errors: ImportErrorRow[]): string {
    const memberColumns = Object.keys(toErrorReportRow(errors[0])).filter(column => column !== 'error');
    const customColumns = [...new Set(errors.flatMap(row => Object.keys(customFieldCells(row))))];
    const columns = [...memberColumns, ...customColumns, 'error'];
    const rows = errors.map(row => ({...toErrorReportRow(row), ...customFieldCells(row)}));
    return serialize(rows, {columns});
}

// The one email an import sends, whatever became of it. What the publisher is told and
// what is attached both follow from the result: no result means nothing was written, so
// there is nothing in their file to fix and an attached CSV would say there was, and no
// failed rows means there is nothing for a report to list.
export default function buildImportEmail({result, recipient, labelName, links}: ImportEmailInput): EmailPayload {
    const summary: ImportEmailSummary = !result ? 'did-not-run' : (result.imported > 0 ? 'added' : 'all-failed');

    return {
        to: recipient,
        subject: headingFor[summary],
        html: renderImportEmail({
            summary,
            imported: result?.imported ?? 0,
            errorCount: result?.errors.length ?? 0,
            siteUrl: links.siteUrl(),
            membersUrl: links.membersUrl(result?.importLabel?.slug),
            emailRecipient: recipient
        }),
        forceTextContent: true,
        attachments: result?.errors.length
            ? [{
                filename: `${labelName} - Errors.csv`,
                content: buildErrorReport(result.errors),
                contentType: 'text/csv',
                contentDisposition: 'attachment'
            }]
            : []
    };
}
