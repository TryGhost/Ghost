import { mobiledocToLexical } from '@tryghost/kg-converters';
import type { Snippet } from '@tryghost/admin-x-framework/api/snippets';

interface SerializedNode {
  type?: string;
  children?: unknown[];
}

function parse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

function hasNodes(value: unknown): value is { nodes: unknown[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { nodes?: unknown }).nodes)
  );
}

function fromMobiledoc(mobiledoc: string | null): string | null {
  let root: { children?: SerializedNode[] } | undefined;
  try {
    root = (JSON.parse(mobiledocToLexical(mobiledoc)) as { root?: typeof root }).root;
  } catch {
    return null;
  }

  let nodes: unknown[] = root?.children ?? [];
  // Koenig stores a single-paragraph selection as the paragraph's children.
  if (nodes.length === 1 && (nodes[0] as SerializedNode).type === 'paragraph') {
    nodes = (nodes[0] as SerializedNode).children ?? [];
  }

  return nodes.length ? JSON.stringify({ namespace: 'KoenigEditor', nodes }) : null;
}

/**
 * The value Koenig inserts for a snippet: its lexical clipboard JSON, unwrapped
 * when it was saved double-encoded or converted from mobiledoc when it has none.
 */
export function toSnippetValue(snippet: Pick<Snippet, 'lexical' | 'mobiledoc'>): string | null {
  if (snippet.lexical) {
    const parsed = parse(snippet.lexical);
    if (typeof parsed === 'string') {
      const inner = parse(parsed);
      if (hasNodes(inner) && inner.nodes.length) {
        return parsed;
      }
    } else if (typeof parsed === 'object' && parsed !== null) {
      return snippet.lexical;
    }
  }

  return fromMobiledoc(snippet.mobiledoc);
}
