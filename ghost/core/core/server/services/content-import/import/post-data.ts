import { importableRowSchema, type PostImportRow } from './row';

const { slugify } = require('@tryghost/string');

export type HtmlToLexical = (html: string) => unknown;

// A malformed row, refused before any write was attempted; distinct from a write
// that failed, which the importer records separately.
export class RowSkipped extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'RowSkipped';
  }
}

// The values handed to models.Post.add. Content is lexical only: under
// options.importing the model strips client-supplied html and regenerates it from
// lexical on save, so the CSV's html must be converted, never passed through.
// No authors key: the model resolves the import's internal context to the owner.
export interface PostData {
  title: string;
  slug: string;
  lexical?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  status: 'published';
  type: 'post';
  visibility: 'public';
  tags: Array<{ name: string }>;
}

export default function buildPostData(
  row: PostImportRow,
  htmlToLexical: HtmlToLexical,
  importTagNames: string[],
): PostData {
  const check = importableRowSchema.safeParse(row);
  if (!check.success) {
    throw new RowSkipped(check.error.issues[0].message);
  }

  const data: PostData = {
    title: row.title,
    // Slugified here with the standard rules: left to the model, the
    // importing-context slug pass keeps every punctuation dash
    // (slugify requiredChangesOnly).
    slug: slugify(row.title),
    // Explicit rather than left to the model, which would default status to draft and
    // visibility to the default_content_visibility setting. Never 'scheduled': the
    // post scheduler has no importing check.
    status: 'published',
    type: 'post',
    visibility: 'public',
    // The # prefix gives the batch tags internal visibility.
    tags: importTagNames.map((name) => ({ name })),
  };

  if (row.html) {
    try {
      data.lexical = JSON.stringify(htmlToLexical(row.html));
    } catch {
      throw new RowSkipped('html could not be converted');
    }
  }

  // The one date column dates the whole post; preserved only because the write runs
  // under options.importing, which stops the model stamping its own timestamps.
  if (row.published_at) {
    data.published_at = row.published_at;
    data.created_at = row.published_at;
    data.updated_at = row.published_at;
  }

  return data;
}
