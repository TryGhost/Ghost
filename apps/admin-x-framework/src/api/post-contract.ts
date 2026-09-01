/**
 * Request contract for post/page reads and writes against the Admin API.
 *
 * The Ember editor's adapters and serializers are the spec here — these
 * builders must produce the same query params and payload shapes as
 * `apps/ember-admin/app/adapters/post.js`, `adapters/page.js` and
 * `serializers/post.js`/`page.js` so the API sees identical requests from
 * either client.
 */

/**
 * Posts/pages include all relations by default on reads, but create/update
 * responses only include what is explicitly requested — so writes re-request
 * everything, including `post_revisions` for the client-side revision compare.
 */
export const ALL_POST_INCLUDES = [
  'tags',
  'authors',
  'authors.roles',
  'email',
  'tiers',
  'newsletter',
  'count.clicks',
  'post_revisions',
  'post_revisions.author',
].join(',');

/** Every post/page request asks for both content formats. */
export const POST_FORMATS = 'mobiledoc,lexical';

// The publish flow's "everyone" segment; the API expects it spelled `all`
const ALL_MEMBERS_SEGMENT = 'status:free,status:-free';

export interface PostCreateOptions {
  /** Convert an HTML payload to lexical content. */
  source?: 'html';
}

export interface PageWriteOptions extends PostCreateOptions {
  /** Force the server to store a post revision (explicit save, leaving the editor). */
  saveRevision?: boolean;
  /** Ask the server to convert the record's mobiledoc content to lexical. */
  convertToLexical?: boolean;
}

export interface PostWriteOptions extends PageWriteOptions {
  /** Newsletter slug. Presence means "email this publish". */
  newsletter?: string;
  /** NQL member filter for the email. Only sent alongside `newsletter`. */
  emailSegment?: string;
}

export function buildPostBrowseParams(): Record<string, string> {
  return { formats: POST_FORMATS };
}

export function buildPostReadParams(): Record<string, string> {
  return { formats: POST_FORMATS };
}

/** Editor reads additionally need revision history and its author relation. */
export function buildPostEditorReadParams(): Record<string, string> {
  return { formats: POST_FORMATS, include: ALL_POST_INCLUDES };
}

/** Query params for post create/update requests. */
export function buildPostWriteParams(options: PostWriteOptions = {}): Record<string, string> {
  const params: Record<string, string> = { formats: POST_FORMATS };

  if (options.source) {
    params.source = options.source;
  }

  if (options.newsletter) {
    params.newsletter = options.newsletter;

    if (options.emailSegment) {
      params.email_segment =
        options.emailSegment === ALL_MEMBERS_SEGMENT ? 'all' : options.emailSegment;
    }
  }

  if (options.saveRevision) {
    params.save_revision = 'true';
  }

  if (options.convertToLexical) {
    params.convert_to_lexical = 'true';
  }

  params.include = ALL_POST_INCLUDES;

  return params;
}

/** Query params for page create/update requests — as posts, minus email delivery. */
export function buildPageWriteParams(options: PageWriteOptions = {}): Record<string, string> {
  const params: Record<string, string> = { formats: POST_FORMATS };

  if (options.source) {
    params.source = options.source;
  }

  if (options.saveRevision) {
    params.save_revision = 'true';
  }

  if (options.convertToLexical) {
    params.convert_to_lexical = 'true';
  }

  params.include = ALL_POST_INCLUDES;

  return params;
}

// Read-only/virtual fields the API must not receive back on writes
const READ_ONLY_POST_FIELDS = [
  'author_id',
  'uuid',
  'url',
  'send_email_when_published',
  'email_recipient_filter',
  'email',
  'newsletter',
  'post_revisions',
  // deprecated single-author field, replaced by `authors`
  'author',
] as const;

// Pages additionally never send email fields
const POST_ONLY_FIELDS = ['email_subject', 'email_only', 'email_id'] as const;

/**
 * Shape an editable post/page into the exact payload the API expects: strips
 * read-only and virtual fields and resolves the visibility/tiers coupling
 * (tiers only accompany `visibility: 'tiers'`, and an empty tiers selection
 * means "leave visibility unchanged").
 */
export function serializePostPayload(
  data: object,
  resource: 'post' | 'page' = 'post',
): Record<string, unknown> {
  const json: Record<string, unknown> = { ...data };

  for (const field of READ_ONLY_POST_FIELDS) {
    delete json[field];
  }

  if (resource === 'page') {
    for (const field of POST_ONLY_FIELDS) {
      delete json[field];
    }
  } else {
    delete json.show_title_and_feature_image;
  }

  if (json.visibility === null) {
    delete json.visibility;
    delete json.visibility_filter;
    delete json.tiers;
  }

  if (json.visibility === 'tiers') {
    delete json.visibility_filter;
  }

  if (json.visibility === 'tiers' && !(json.tiers as unknown[] | undefined)?.length) {
    delete json.visibility;
    delete json.tiers;
  }

  return json;
}
