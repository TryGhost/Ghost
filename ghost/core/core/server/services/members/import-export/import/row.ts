import {z} from 'zod';

// Labels reach the import as a comma-separated cell and are split into objects here.
export interface Label {
    name: string;
}

function splitLabels(cell: string): Label[] {
    return cell ? cell.split(',').map(name => ({name})) : [];
}

// An empty cell (or the literal 'undefined') reads as absent, not as a value -- so an
// empty created_at is a missing date, not the invalid empty string.
const optionalCell = z.string()
    .transform(cell => (cell === '' || cell === 'undefined' ? undefined : cell))
    .optional();

// Present cells are lenient in opposite directions: subscribed unless the cell reads
// 'false', comped only when it reads 'true'. An absent column stays undefined (optional,
// not defaulted), so a CSV lacking these columns leaves the member's state untouched.
const isSubscribed = (cell: string): boolean => cell.toLowerCase() !== 'false';
const isComplimentary = (cell: string): boolean => cell.toLowerCase() === 'true';

// The member import vocabulary as a schema: the single source of truth that coerces the
// raw string Row into typed member fields. Unknown columns (custom_fields.*, and anything
// else a source carries) pass through via .loose() so nothing is lost before the kernel.
export const memberImportRowSchema = z.object({
    id: optionalCell,
    email: optionalCell,
    name: optionalCell,
    note: optionalCell,
    subscribed: z.string().transform(isSubscribed).optional(),
    complimentary_plan: z.string().transform(isComplimentary).optional(),
    stripe_customer_id: optionalCell,
    created_at: optionalCell,
    import_tier: optionalCell,
    gift_id: optionalCell,
    labels: z.string().default('').transform(splitLabels)
}).loose();

export type MemberImportRow = z.infer<typeof memberImportRowSchema>;

// A row that failed to import, carrying the raw message that stopped it. The message is
// left raw here; turning it into human copy is a presentation concern.
export type ImportErrorRow = MemberImportRow & {error: string};

// The persisted import label as plain data -- taken off the Bookshelf model before it
// leaves the kernel, so the result and the email carry only what they show.
export interface ImportLabel {
    name: string;
    slug: string;
}
