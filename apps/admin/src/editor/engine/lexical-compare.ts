import microdiff from 'microdiff';

export type LexicalDocument = Record<string, unknown>;
export type LexicalInput = string | LexicalDocument | null | undefined;

export interface HumanizedDiffEntry {
  type: 'CREATE' | 'REMOVE' | 'CHANGE';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseLexical(input: LexicalInput): LexicalDocument | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }
  if (typeof input === 'string') {
    const parsed: unknown = JSON.parse(input);
    return isRecord(parsed) ? parsed : null;
  }
  return input;
}

// Lexical's reconciler infers `direction` from rendered text at mount time, so
// it differs between a mounted editor, a headless parse, and the saved JSON.
export function stripDirection(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripDirection);
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (key === 'direction') {
        continue;
      }
      out[key] = stripDirection(value[key]);
    }
    return out;
  }
  return value;
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
  if (!isRecord(root) || !Array.isArray(root.children)) {
    return [];
  }
  return root.children;
}

export function normalizeLexicalForCompare(input: LexicalInput): string {
  return stableStringify(stripDirection(rootChildren(parseLexical(input))));
}

export function lexicalEquals(a: LexicalInput, b: LexicalInput): boolean {
  return normalizeLexicalForCompare(a) === normalizeLexicalForCompare(b);
}

export function stripSiteUrl(lexical: string, siteUrl: string): string {
  return siteUrl ? lexical.replaceAll(siteUrl, '') : lexical;
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

export function humanizeLexicalDiff(from: LexicalInput, to: LexicalInput): HumanizedDiffEntry[] {
  const fromDocument = stripDirection(parseLexical(from) ?? {}) as LexicalDocument;
  const toDocument = stripDirection(parseLexical(to) ?? {}) as LexicalDocument;

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
