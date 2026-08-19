import {z} from 'zod';

// An empty cell (or the literal 'undefined') reads as absent, not as a value.
const optionalCell = z.string()
    .transform(cell => (cell === '' || cell === 'undefined' ? undefined : cell))
    .optional();

// title is trimmed here because the model's own trim is skipped under
// options.importing; unknown columns pass through (.loose()) for field mapping.
export const postImportRowSchema = z.object({
    title: z.string().default('').transform(cell => cell.trim()),
    html: z.string().default(''),
    published_at: optionalCell
}).loose();

export type PostImportRow = z.infer<typeof postImportRowSchema>;
