import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';

export const EDITORIAL_POST_FIELDS = [
  'title',
  'html',
  'markdown',
  'slug',
  'custom_excerpt',
  'type',
  'status',
  'visibility',
  'featured',
  'created_at',
  'updated_at',
  'published_at',
  'authors',
  'author_emails',
  'tags',
  'feature_image',
  'feature_image_alt',
  'feature_image_caption',
  'show_title_and_feature_image',
  'meta_title',
  'meta_description',
  'canonical_url',
  'og_image',
  'og_title',
  'og_description',
  'twitter_image',
  'twitter_title',
  'twitter_description',
  'comment_id',
  'custom_template',
  'codeinjection_head',
  'codeinjection_foot',
] as const;

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
    markdown: z.string().default(''),
    slug: optionalCell,
    custom_excerpt: optionalCell,
    type: optionalCell,
    status: optionalCell,
    visibility: optionalCell,
    featured: optionalCell,
    created_at: optionalCell,
    updated_at: optionalCell,
    published_at: optionalCell,
    authors: optionalCell,
    author_emails: optionalCell,
    tags: optionalCell,
    feature_image: optionalCell,
    feature_image_alt: optionalCell,
    feature_image_caption: optionalCell,
    show_title_and_feature_image: optionalCell,
    meta_title: optionalCell,
    meta_description: optionalCell,
    canonical_url: optionalCell,
    og_image: optionalCell,
    og_title: optionalCell,
    og_description: optionalCell,
    twitter_image: optionalCell,
    twitter_title: optionalCell,
    twitter_description: optionalCell,
    comment_id: optionalCell,
    custom_template: optionalCell,
    codeinjection_head: optionalCell,
    codeinjection_foot: optionalCell,
  })
  .loose();

export type PostImportRow = z.infer<typeof postImportRowSchema>;

const ENUM_FIELDS = {
  type: ['post', 'page'],
  status: ['draft', 'published'],
  visibility: ['public', 'members', 'paid'],
} as const;
const BOOLEAN_FIELDS = ['featured', 'show_title_and_feature_image'] as const;
const DATE_FIELDS = ['created_at', 'updated_at', 'published_at'] as const;

// Validation for coerced rows; buildPostData turns the first issue into a row
// skip. A blank title is refused because the model's (Untitled) fallback is
// skipped under options.importing. Invalid source values are refused per row
// rather than silently replaced with defaults.
export const importableRowSchema = postImportRowSchema.superRefine((row, ctx) => {
  if (!row.title) {
    ctx.addIssue({ code: 'custom', message: 'title is required' });
  } else if (row.title.length > 255) {
    ctx.addIssue({ code: 'custom', message: 'title must be 255 characters or fewer' });
  }

  if (row.comment_id && row.comment_id.length > 50) {
    ctx.addIssue({ code: 'custom', message: 'comment_id must be 50 characters or fewer' });
  }

  for (const field of DATE_FIELDS) {
    const value = row[field];
    if (value && !isValidDate(value)) {
      ctx.addIssue({ code: 'custom', message: `${field} is not a valid date: "${value}"` });
    }
  }

  for (const [field, allowed] of Object.entries(ENUM_FIELDS)) {
    const value = row[field];
    if (typeof value === 'string' && !allowed.includes(value as never)) {
      ctx.addIssue({ code: 'custom', message: `${field} must be one of: ${allowed.join(', ')}` });
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    const value = row[field];
    if (value && !['true', 'false', '1', '0'].includes(value.toLowerCase())) {
      ctx.addIssue({ code: 'custom', message: `${field} must be true, false, 1, or 0` });
    }
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
