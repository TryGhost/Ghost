import { importableRowSchema, type PostImportRow } from './row';

const { slugify } = require('@tryghost/string');

export type HtmlToLexical = (html: string) => unknown;
export type MarkdownToHtml = (markdown: string) => string;
export type CleanHTML = (args: { html: string; opinionated: boolean }) => string;

// A malformed row, refused before any write was attempted; distinct from a write
// that failed, which the importer records separately.
export class RowSkipped extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'RowSkipped';
  }
}

export interface PostsMetaData {
  feature_image_alt?: string;
  feature_image_caption?: string;
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
  og_title?: string;
  og_description?: string;
  twitter_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  frontmatter?: string;
}

// The values handed to models.Post.add. Content is lexical only: under
// options.importing the model strips client-supplied html and regenerates it from
// lexical on save, so the CSV's html must be converted, never passed through.
// No authors key: the model resolves the import's internal context to the owner.
export interface PostData {
  title: string;
  slug: string;
  lexical?: string;
  custom_excerpt?: string;
  feature_image?: string;
  canonical_url?: string;
  custom_template?: string;
  codeinjection_head?: string;
  codeinjection_foot?: string;
  featured?: boolean;
  show_title_and_feature_image?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  status: 'draft' | 'published';
  type: 'post' | 'page';
  visibility: 'public' | 'members' | 'paid';
  tags: Array<{ name: string }>;
  posts_meta?: PostsMetaData;
}

const DIRECT_OPTIONAL_FIELDS = [
  'custom_excerpt',
  'feature_image',
  'canonical_url',
  'custom_template',
  'codeinjection_head',
  'codeinjection_foot',
] as const;

const META_FIELDS = [
  'feature_image_alt',
  'feature_image_caption',
  'meta_title',
  'meta_description',
  'og_image',
  'og_title',
  'og_description',
  'twitter_image',
  'twitter_title',
  'twitter_description',
  'frontmatter',
] as const;

export default function buildPostData(
  row: PostImportRow,
  htmlToLexical: HtmlToLexical,
  importTagNames: string[],
  markdownToHtml?: MarkdownToHtml,
  cleanHTML?: CleanHTML,
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
    slug: slugify(row.slug ?? row.title),
    // Explicit rather than left to the model, which would default visibility
    // from the site setting. Never 'scheduled': the post scheduler has no
    // importing check.
    status: (row.status as PostData['status'] | undefined) ?? 'published',
    type: (row.type as PostData['type'] | undefined) ?? 'post',
    visibility: (row.visibility as PostData['visibility'] | undefined) ?? 'public',
    // The # prefix gives the batch tags internal visibility.
    tags: importTagNames.map((name) => ({ name })),
  };

  if (row.html && row.markdown) {
    throw new RowSkipped('html and markdown cannot both be provided');
  }

  let sourceHTML = row.html;
  let sourceKind: 'html' | 'markdown' = 'html';
  if (row.markdown) {
    if (!markdownToHtml) {
      throw new RowSkipped('markdown could not be converted');
    }
    try {
      sourceHTML = markdownToHtml(row.markdown);
      sourceKind = 'markdown';
    } catch {
      throw new RowSkipped('markdown could not be converted');
    }
  }

  if (sourceHTML) {
    let cleanedHTML = sourceHTML;
    if (cleanHTML) {
      try {
        cleanedHTML = cleanHTML({ html: sourceHTML, opinionated: true });
      } catch {
        throw new RowSkipped('html could not be cleaned');
      }
    }

    try {
      data.lexical = JSON.stringify(htmlToLexical(cleanedHTML));
    } catch {
      throw new RowSkipped(`${sourceKind} could not be converted`);
    }
  }

  for (const field of DIRECT_OPTIONAL_FIELDS) {
    if (row[field] !== undefined) {
      data[field] = row[field];
    }
  }

  if (row.featured !== undefined) {
    data.featured = toBoolean(row.featured);
  }
  if (row.show_title_and_feature_image !== undefined) {
    data.show_title_and_feature_image = toBoolean(row.show_title_and_feature_image);
  }

  // published_at remains the fallback timestamp for the whole post, while an
  // explicit created_at or updated_at wins for that individual field.
  if (row.published_at) {
    data.published_at = row.published_at;
  }
  if (row.created_at ?? row.published_at) {
    data.created_at = row.created_at ?? row.published_at;
  }
  if (row.updated_at ?? row.published_at) {
    data.updated_at = row.updated_at ?? row.published_at;
  }

  const postsMeta: PostsMetaData = {};
  for (const field of META_FIELDS) {
    if (row[field] !== undefined) {
      postsMeta[field] = row[field];
    }
  }
  if (Object.keys(postsMeta).length > 0) {
    data.posts_meta = postsMeta;
  }

  return data;
}

function toBoolean(value: string): boolean {
  return value === '1' || value.toLowerCase() === 'true';
}
