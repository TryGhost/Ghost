import {z} from 'zod';

// A label to tag imported members with. Labels reach the import as a comma-separated
// cell and are split into objects here, in the domain, where we know what a label is.
export interface Label {
    name: string;
}

function splitLabels(cell: string): Label[] {
    return cell ? cell.split(',').map(name => ({name})) : [];
}

// A string cell that reads as absent when empty (or the literal 'undefined'),
// preserving the import's long-standing "an empty cell is nothing" rule -- so an empty
// created_at is a missing date, not the invalid empty string.
const optionalCell = z.string()
    .transform(cell => (cell === '' || cell === 'undefined' ? undefined : cell))
    .optional();

// The member import vocabulary as a schema -- the single source of truth. It coerces
// the raw string Row the CSV reader emits into typed member fields, keeping the exact
// lenient rules the import has always used: subscribed is true unless the cell is
// literally 'false'; complimentary_plan is false unless it is literally 'true'. Unknown
// columns (custom_fields.*, and anything else a source preserves) pass through so a
// failed row can be reported back in full. MemberImportRow is this schema's inferred
// type, so the kernel reads precisely-typed fields with no casts.
export const memberImportRowSchema = z.object({
    id: optionalCell,
    email: optionalCell,
    name: optionalCell,
    note: optionalCell,
    subscribed: z.string().default('').transform(cell => cell.toLowerCase() !== 'false'),
    complimentary_plan: z.string().default('').transform(cell => cell.toLowerCase() === 'true'),
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
