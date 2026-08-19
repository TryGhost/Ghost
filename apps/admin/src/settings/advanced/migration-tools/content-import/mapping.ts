export interface ContentField {
  label: string;
  value: string;
  required: boolean;
}

interface ContentFieldGroup {
  label: string;
  fields: readonly ContentField[];
}

export const CONTENT_FIELD_GROUPS: readonly ContentFieldGroup[] = [
  {
    label: 'Content',
    fields: [
      { label: 'Title', value: 'title', required: true },
      { label: 'HTML', value: 'html', required: false },
      { label: 'Markdown', value: 'markdown', required: false },
      { label: 'Slug', value: 'slug', required: false },
      { label: 'Custom excerpt', value: 'custom_excerpt', required: false },
    ],
  },
  {
    label: 'Publishing',
    fields: [
      { label: 'Type', value: 'type', required: false },
      { label: 'Status', value: 'status', required: false },
      { label: 'Visibility', value: 'visibility', required: false },
      { label: 'Featured', value: 'featured', required: false },
      { label: 'Created at', value: 'created_at', required: false },
      { label: 'Updated at', value: 'updated_at', required: false },
      { label: 'Published at', value: 'published_at', required: false },
    ],
  },
  {
    label: 'Images',
    fields: [
      { label: 'Feature image', value: 'feature_image', required: false },
      { label: 'Feature image alt', value: 'feature_image_alt', required: false },
      { label: 'Feature image caption', value: 'feature_image_caption', required: false },
      {
        label: 'Show title and feature image',
        value: 'show_title_and_feature_image',
        required: false,
      },
    ],
  },
  {
    label: 'SEO',
    fields: [
      { label: 'Meta title', value: 'meta_title', required: false },
      { label: 'Meta description', value: 'meta_description', required: false },
      { label: 'Canonical URL', value: 'canonical_url', required: false },
    ],
  },
  {
    label: 'Social',
    fields: [
      { label: 'Open Graph image', value: 'og_image', required: false },
      { label: 'Open Graph title', value: 'og_title', required: false },
      { label: 'Open Graph description', value: 'og_description', required: false },
      { label: 'Twitter image', value: 'twitter_image', required: false },
      { label: 'Twitter title', value: 'twitter_title', required: false },
      { label: 'Twitter description', value: 'twitter_description', required: false },
    ],
  },
  {
    label: 'Advanced',
    fields: [
      { label: 'Custom template', value: 'custom_template', required: false },
      { label: 'Code injection head', value: 'codeinjection_head', required: false },
      { label: 'Code injection foot', value: 'codeinjection_foot', required: false },
      { label: 'Frontmatter', value: 'frontmatter', required: false },
    ],
  },
] as const;

export const CONTENT_FIELD_MAPPINGS = CONTENT_FIELD_GROUPS.flatMap((group) => group.fields);

export class ContentFieldMapping {
  private readonly mapping: Record<string, string | null>;

  constructor(mapping: Record<string, string | null>) {
    this.mapping = { ...mapping };
  }

  static empty(columns: string[]): ContentFieldMapping {
    return new ContentFieldMapping(Object.fromEntries(columns.map((column) => [column, null])));
  }

  static detect(columns: string[]): ContentFieldMapping {
    const targets = new Set<string>(CONTENT_FIELD_MAPPINGS.map((field) => field.value));
    return new ContentFieldMapping(
      Object.fromEntries(columns.map((column) => [column, targets.has(column) ? column : null])),
    );
  }

  get(column: string): string | null {
    return this.mapping[column] ?? null;
  }

  hasTarget(target: string): boolean {
    return Object.values(this.mapping).includes(target);
  }

  update(column: string, target: string | null): ContentFieldMapping {
    const next = { ...this.mapping };
    if (target) {
      for (const mappedColumn of Object.keys(next)) {
        if (next[mappedColumn] === target) {
          next[mappedColumn] = null;
        }
      }
    }
    next[column] = target;
    return new ContentFieldMapping(next);
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.mapping).map(([column, target]) => [column, target ?? '']),
    );
  }
}
