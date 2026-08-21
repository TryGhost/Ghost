import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';

// An empty cell (or the literal 'undefined') reads as absent, not as a value.
const optionalCell = z
  .string()
  .transform((cell) => (cell === '' || cell === 'undefined' ? undefined : cell))
  .optional();

// title is trimmed here because the model's own trim is skipped under
// options.importing; unknown columns pass through (.loose()) for field mapping.
export const postImportRowSchema = z
  .object({
    title: z
      .string()
      .default('')
      .transform((cell) => cell.trim()),
    html: z.string().default(''),
    published_at: optionalCell,
  })
  .loose();

export type PostImportRow = z.infer<typeof postImportRowSchema>;

// Validation for coerced rows; buildPostData turns the first issue into a row
// skip. A blank title is refused because the model's (Untitled) fallback is
// skipped under options.importing; an invalid date is refused rather than
// silently replaced with the import time (what the JSON importer does). The
// title cap matches the posts schema's isLength validation.
export const importableRowSchema = z
  .object({
    title: z.string().min(1, 'title is required').max(255, 'title must be 255 characters or fewer'),
  })
  .loose()
  .superRefine((row, ctx) => {
    const publishedAt = row.published_at;
    if (typeof publishedAt === 'string' && !isValidDate(publishedAt)) {
      ctx.addIssue({
        code: 'custom',
        message: `published_at is not a valid date: "${publishedAt}"`,
      });
    }
  });

// new Date() alone is not enough: it normalizes rolled-over calendar dates, so
// 2025-02-30 silently becomes March 2. For ISO-shaped values the calendar components
// are checked strictly with Temporal; other formats stay as loose as new Date().
function isValidDate(value: string): boolean {
  if (Number.isNaN(new Date(value).getTime())) {
    return false;
  }

  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!isoDate) {
    return true;
  }

  try {
    Temporal.PlainDate.from(
      { year: Number(isoDate[1]), month: Number(isoDate[2]), day: Number(isoDate[3]) },
      { overflow: 'reject' },
    );
    return true;
  } catch {
    return false;
  }
}
