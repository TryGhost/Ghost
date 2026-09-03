/** Shared Admin API type contracts for posts and pages. */

type Override<Base, Changes> = Omit<Base, keyof Changes> & Changes;

export type Email = {
  id?: string;
  opened_count: number;
  email_count: number;
  status?: 'pending' | 'submitting' | 'submitted' | 'failed';
  error?: string | null;
  track_opens?: boolean;
  track_clicks?: boolean;
};

// Every field is optional because list and analytics endpoints return different
// projections of these relations.
export type PostAuthor = {
  id?: string;
  name?: string;
  email?: string;
  slug?: string;
  profile_image?: string | null;
};

export type PostTag = {
  id?: string;
  name?: string;
  slug?: string;
  visibility?: string;
};

export type PostStatus = 'published' | 'draft' | 'scheduled' | 'sent';
export type PageStatus = Exclude<PostStatus, 'sent'>;

type AtLeastOne<T> = {
  [Key in keyof T]-?: Required<Pick<T, Key>> & Partial<Omit<T, Key>>;
}[keyof T];

export type PostAuthorInput = string | AtLeastOne<{ id: string; slug: string; email: string }>;

export type PostTagInput =
  | string
  | ({ id: string } & Partial<{ name: string; slug: string | null }>)
  | ({ name: string } & Partial<{ id: string; slug: string | null }>)
  | ({ slug: string } & Partial<{ id: string; name: string }>);

export type PostTierInput = { id: string };

export type PostTier = {
  id: string;
  name?: string;
  slug?: string | null;
};

export type PostRevision = {
  id?: string;
  post_id?: string;
  lexical?: string | null;
  title?: string | null;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  custom_excerpt?: string | null;
  post_status?: string | null;
  reason?: string | null;
  created_at?: string;
  author?: PostAuthor | null;
};

/** Fields shared by post and page list responses. */
export type ContentListFields = {
  featured?: boolean;
  updated_at?: string | null;
  created_at?: string;
  excerpt?: string | null;
  custom_excerpt?: string | null;
  authors?: PostAuthor[];
  primary_author?: PostAuthor | null;
  tags?: PostTag[];
  primary_tag?: PostTag | null;
  tiers?: object[];
};

/** Fields shared by post and page editor responses. */
export type ContentEditorFields = {
  lexical?: string | null;
  mobiledoc?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  custom_template?: string | null;
  codeinjection_head?: string | null;
  codeinjection_foot?: string | null;
  og_image?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_image?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  feature_image_alt?: string | null;
  feature_image_caption?: string | null;
  post_revisions?: PostRevision[];
};

export type PostCount = {
  clicks?: number;
  conversions?: number;
  signups?: number;
  paid_conversions?: number;
  positive_feedback?: number;
  negative_feedback?: number;
};

export type PageCount = {
  signups?: number;
  paid_conversions?: number;
};

/** Broad response record shared by the posts and pages endpoints. */
export type ContentRecord = {
  id: string;
  url: string;
  slug: string;
  title: string;
  visibility?: string;
  uuid?: string;
  feature_image?: string | null;
  published_at?: string | null;
} & ContentListFields &
  ContentEditorFields;

export type PostEmailFields = {
  email?: Email | null;
  email_subject?: string | null;
  newsletter?: object | null;
  email_only?: boolean;
  email_segment?: string | null;
};

export type Post = Override<
  ContentRecord,
  {
    uuid: string;
    status?: PostStatus;
    count?: PostCount;
  }
> &
  PostEmailFields;

export type Page = Override<
  ContentRecord,
  {
    status?: PageStatus;
    count?: PageCount;
    show_title_and_feature_image?: boolean;
  }
>;

// Write access stays opt-in: a new response field must not silently become
// writable. Pick supplies each allowed field's value type from ContentRecord.
type ContentWritableKey =
  | 'title'
  | 'slug'
  | 'mobiledoc'
  | 'lexical'
  | 'feature_image'
  | 'feature_image_alt'
  | 'feature_image_caption'
  | 'featured'
  | 'meta_title'
  | 'meta_description'
  | 'updated_at'
  | 'published_at'
  | 'custom_excerpt'
  | 'codeinjection_head'
  | 'codeinjection_foot'
  | 'og_image'
  | 'og_title'
  | 'og_description'
  | 'twitter_image'
  | 'twitter_title'
  | 'twitter_description'
  | 'custom_template'
  | 'canonical_url';

type ContentEditableScalars = Partial<Pick<ContentRecord, ContentWritableKey>>;

/** Shared post/page input, including fields whose input shape differs from output. */
export type ContentEditableData = Override<
  ContentEditableScalars,
  {
    html?: string | null;
    locale?: string | null;
    // The serializer treats null visibility as "leave visibility unchanged".
    visibility?: string | null;
    visibility_filter?: string | null;
    authors?: PostAuthorInput[];
    tags?: PostTagInput[];
    tiers?: PostTierInput[];
  }
>;

export type PostEditableData = ContentEditableData &
  Partial<Pick<Post, 'status' | 'email_subject' | 'email_only'>>;

export type PageEditableData = ContentEditableData &
  Partial<Pick<Page, 'status' | 'show_title_and_feature_image'>>;

type EditorRelations = {
  updated_at: string | null;
  authors?: Array<PostAuthor & { id: string }>;
  tags?: Array<PostTag & { id: string }>;
  tiers?: PostTier[];
};

/** A single editor response has the relations required for a safe round-trip edit. */
export type EditorRecord<RecordType extends ContentRecord> = Override<RecordType, EditorRelations>;

export type PostEditorRecord = EditorRecord<Post>;
export type PageEditorRecord = EditorRecord<Page>;

export type CreateContentData<Data extends { title?: string }> = Override<Data, { title: string }>;

export type EditContentData<Data extends { updated_at?: string | null }> = Override<
  Data,
  { id: string; updated_at: string | null }
>;

export type PostBulkAction =
  | { type: 'feature' }
  | { type: 'unfeature' }
  | { type: 'unpublish' }
  | { type: 'unschedule' }
  | { type: 'addTag'; meta: { tags: { id?: string; name: string; slug?: string }[] } }
  | { type: 'access'; meta: { visibility: string; tiers?: { id: string }[] } };

// Compatibility aliases for existing imports from api/posts.
export type PostListFields = ContentListFields;
export type PostEditorFields = ContentEditorFields & Pick<PostEmailFields, 'email_subject'>;
