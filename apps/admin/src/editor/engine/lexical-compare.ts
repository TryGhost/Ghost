import microdiff from 'microdiff';

export type LexicalDocument = Record<string, unknown>;
export type LexicalInput = string | LexicalDocument | null | undefined;

export interface HumanizedDiffEntry {
  type: 'CREATE' | 'REMOVE' | 'CHANGE';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

export class LexicalParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'LexicalParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// null, undefined and '' are a known-empty document; anything else must carry
// an object root with a children array or it is invalid, never empty.
export function parseLexical(input: LexicalInput): LexicalDocument | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'invalid JSON';
      throw new LexicalParseError(message, { cause });
    }
  }
  if (!isRecord(parsed) || !isRecord(parsed.root) || !Array.isArray(parsed.root.children)) {
    throw new LexicalParseError('lexical root must be an object with a children array');
  }
  return parsed;
}

// Lexical's reconciler infers element `direction` from rendered text at mount
// time, so it differs between a mounted editor, a headless parse, and saved JSON.
export function stripDirection(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripDirection);
  }
  if (isRecord(value) && Array.isArray(value.children)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (key === 'direction') {
        continue;
      }
      out[key] = key === 'children' ? stripDirection(value.children) : value[key];
    }
    return out;
  }
  return value;
}

type UrlField = 'url' | Record<string, 'url'>;

// Mirrors kg-default-nodes' urlTransformMap (the properties the server rewrites
// on save), url-typed entries only; html/markdown/caption fields stay opaque.
const CARD_URL_FIELDS: Record<string, Record<string, UrlField>> = {
  audio: { src: 'url' },
  bookmark: { url: 'url', 'metadata.icon': 'url', 'metadata.thumbnail': 'url' },
  button: { buttonUrl: 'url' },
  'email-cta': { buttonUrl: 'url' },
  embed: { url: 'url' },
  file: { src: 'url' },
  gallery: { images: { src: 'url' } },
  header: { buttonUrl: 'url', backgroundImageSrc: 'url' },
  image: { src: 'url', href: 'url' },
  product: { productImageSrc: 'url' },
  video: { src: 'url', thumbnailSrc: 'url', customThumbnailSrc: 'url' },
};

function parseSiteUrl(siteUrl: string): URL | null {
  if (!siteUrl) {
    return null;
  }
  try {
    return new URL(siteUrl);
  } catch {
    return null;
  }
}

// Same rule as url-utils' absoluteToRelative: host match (protocol ignored), a path
// under the site's subdirectory (kept in the result), and userinfo URLs left alone.
function toSiteRelative(value: string, site: URL): string {
  let parsed: URL;
  try {
    parsed = new URL(value.startsWith('//') ? `${site.protocol}${value}` : value);
  } catch {
    return value;
  }
  if (parsed.username || parsed.password) {
    return value;
  }
  if (parsed.host !== site.host || !parsed.pathname.startsWith(site.pathname)) {
    return value;
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function updateAt(
  record: Record<string, unknown>,
  [head, ...rest]: string[],
  update: (value: unknown) => unknown,
): Record<string, unknown> {
  if (head === undefined || !(head in record)) {
    return record;
  }
  const current = record[head];
  if (rest.length === 0) {
    return { ...record, [head]: update(current) };
  }
  return isRecord(current) ? { ...record, [head]: updateAt(current, rest, update) } : record;
}

function normalizeUrlField(value: unknown, field: UrlField, site: URL): unknown {
  if (field === 'url') {
    return typeof value === 'string' ? toSiteRelative(value, site) : value;
  }
  if (!Array.isArray(value)) {
    return value;
  }
  const items: unknown[] = value;
  return items.map((item) => (isRecord(item) ? normalizeUrlFields(item, field, site) : item));
}

function normalizeUrlFields(
  node: Record<string, unknown>,
  fields: Record<string, UrlField>,
  site: URL,
): Record<string, unknown> {
  let out = node;
  for (const [path, field] of Object.entries(fields)) {
    out = updateAt(out, path.split('.'), (value) => normalizeUrlField(value, field, site));
  }
  return out;
}

function normalizeNodeUrls(value: unknown, site: URL): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeNodeUrls(item, site));
  }
  if (!isRecord(value)) {
    return value;
  }
  const fields = typeof value.type === 'string' ? CARD_URL_FIELDS[value.type] : undefined;
  let out = fields ? normalizeUrlFields(value, fields, site) : value;
  if (!fields && typeof value.url === 'string') {
    out = { ...out, url: toSiteRelative(value.url, site) };
  }
  if (Array.isArray(value.children)) {
    out = { ...out, children: normalizeNodeUrls(value.children, site) };
  }
  return out;
}

export function normalizeSiteUrls(children: unknown[], siteUrl: string): unknown[] {
  const site = parseSiteUrl(siteUrl);
  return site ? (normalizeNodeUrls(children, site) as unknown[]) : children;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    const entries = keys
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function rootChildren(document: LexicalDocument | null): unknown[] {
  const root = document?.root;
  return isRecord(root) && Array.isArray(root.children) ? root.children : [];
}

function comparableChildren(input: LexicalInput, siteUrl: string): unknown {
  return stripDirection(normalizeSiteUrls(rootChildren(parseLexical(input)), siteUrl));
}

export function normalizeLexicalForCompare(input: LexicalInput, siteUrl = ''): string {
  return stableStringify(comparableChildren(input, siteUrl));
}

export function lexicalEquals(a: LexicalInput, b: LexicalInput, siteUrl = ''): boolean {
  return normalizeLexicalForCompare(a, siteUrl) === normalizeLexicalForCompare(b, siteUrl);
}

function nodeAt(document: unknown, path: ReadonlyArray<string | number>): unknown {
  let current: unknown = document;
  for (const segment of path) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (isRecord(current)) {
      current = current[String(segment)];
    } else {
      return undefined;
    }
  }
  return current;
}

function humanizePath(path: ReadonlyArray<string | number>, document: unknown): string {
  return path
    .map((segment, index) => {
      if (typeof segment !== 'number') {
        return segment;
      }
      const node = nodeAt(document, path.slice(0, index + 1));
      const type = isRecord(node) ? node.type : undefined;
      return typeof type === 'string' ? `${segment}[${type}]` : String(segment);
    })
    .join('.');
}

function comparableDocument(input: LexicalInput, siteUrl: string): LexicalDocument {
  const document = parseLexical(input);
  if (!document) {
    return {};
  }
  const root = document.root as Record<string, unknown>;
  const normalized = {
    ...document,
    root: { ...root, children: normalizeSiteUrls(rootChildren(document), siteUrl) },
  };
  return Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => [key, stripDirection(value)]),
  );
}

export function humanizeLexicalDiff(
  from: LexicalInput,
  to: LexicalInput,
  siteUrl = '',
): HumanizedDiffEntry[] {
  const fromDocument = comparableDocument(from, siteUrl);
  const toDocument = comparableDocument(to, siteUrl);

  return microdiff(fromDocument, toDocument, { cyclesFix: false }).map((change) => {
    const entry: HumanizedDiffEntry = {
      type: change.type,
      path: humanizePath(change.path, fromDocument),
    };
    if ('value' in change) {
      entry.value = change.value;
    }
    if ('oldValue' in change) {
      entry.oldValue = change.oldValue;
    }
    return entry;
  });
}
