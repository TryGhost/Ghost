export const CONTENT_FIELD_MAPPINGS = [
  { label: 'Title', value: 'title' },
  { label: 'HTML', value: 'html' },
  { label: 'Published at', value: 'published_at' },
] as const;

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
