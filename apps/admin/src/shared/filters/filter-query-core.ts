import nql from '@tryghost/nql-lang';
import { getCompoundChildren, isAstNode } from './filter-ast';
import { keyIsUnder } from './filter-keys';
import { listsOperator } from './filter-operators';
import { resolveField } from './resolve-field';
import type { AstNode } from './filter-ast';
import type { FilterField, FilterPredicate, ParsedPredicate } from './filter-types';

export function parseFilterToAst(filter: string): AstNode | undefined {
  if (!filter) {
    return undefined;
  }

  try {
    // Without this option nql turns `now-7d` into the exact timestamp it happens to be right
    // now, and we would have no way of telling it apart from a date the user typed. The pill
    // would stop saying "in the last 7 days" and freeze to a fixed day.
    return nql.parse(filter, { preserveRelativeDates: true }) as AstNode;
  } catch {
    return undefined;
  }
}

export function stampPredicates(predicates: ParsedPredicate[]): FilterPredicate[] {
  return predicates.map((predicate, index) => ({
    ...predicate,
    id: `${predicate.field}:${index + 1}`,
  }));
}

export function getFieldKeysByType<TFields extends Record<string, FilterField>>(
  fields: TFields,
  type: FilterField['ui']['type'],
): Set<string> {
  const keys = new Set<string>();

  Object.entries(fields).forEach(([key, definition]) => {
    if (definition.ui.type !== type) {
      return;
    }

    keys.add(key);
    definition.parseKeys?.forEach((parseKey) => keys.add(parseKey));
  });

  return keys;
}

export function hasFieldKey(node: AstNode, fieldKeys: ReadonlySet<string>): boolean {
  if (Object.keys(node).some((key) => fieldKeys.has(key))) {
    return true;
  }

  return Object.values(node).some((value) => {
    if (Array.isArray(value)) {
      return value.some((child) => isAstNode(child) && hasFieldKey(child, fieldKeys));
    }

    return isAstNode(value) && hasFieldKey(value, fieldKeys);
  });
}

/**
 * Whether a filter names a key, or any key beneath a namespace.
 *
 * Answered by parsing rather than by looking through the text, because only the parser knows
 * which characters are structure and which are somebody's data: `name:'+newsletters.slug'` is a
 * search for that text, not a filter on a newsletter, and the quoting is what says so. Reading
 * the filter as text means reimplementing quoting and escaping, which has been got wrong here
 * more than once.
 *
 * A filter that cannot be parsed names nothing, which is the same answer the rest of the page
 * gives it.
 */
export function filterNamesKey(filter: string | undefined, keyOrNamespace: string): boolean {
  const ast = parseFilterToAst(filter ?? '');

  return ast ? namesKey(ast, keyOrNamespace) : false;
}

function namesKey(node: AstNode, keyOrNamespace: string): boolean {
  if (Object.keys(node).some((key) => !key.startsWith('$') && keyIsUnder(key, keyOrNamespace))) {
    return true;
  }

  return Object.values(node).some((value) => {
    if (Array.isArray(value)) {
      return value.some((child) => isAstNode(child) && namesKey(child, keyOrNamespace));
    }

    return isAstNode(value) && namesKey(value, keyOrNamespace);
  });
}

export function dispatchCompoundNode<TFields extends Record<string, FilterField>>(
  node: AstNode,
  fields: TFields,
  timezone: string,
): ParsedPredicate | null {
  for (const [key, definition] of Object.entries(fields)) {
    const parsed = definition.codec.parseCompound?.(node, {
      key,
      pattern: key,
      params: {},
      timezone,
    });

    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export function dispatchSimpleNodes<TFields extends Record<string, FilterField>>(
  nodes: AstNode[],
  fields: TFields,
  timezone: string,
): ParsedPredicate[] {
  return nodes.flatMap((node) => {
    const keys = Object.keys(node);

    if (keys.length !== 1 || keys[0].startsWith('$')) {
      return [];
    }

    const resolved = resolveField(fields, keys[0], timezone);

    if (resolved) {
      const parsed = resolved.definition.codec.parse(node, resolved.context);

      if (parsed) {
        return [parsed];
      }
    }

    return [];
  });
}

function getCompound(node: AstNode): { operator: '$and' | '$or'; children: AstNode[] } | null {
  for (const operator of ['$and', '$or'] as const) {
    const children = getCompoundChildren(node, operator);

    if (children) {
      return { operator, children };
    }
  }

  return null;
}

// A whole filter read into predicates. A field addressed across several clauses gets first
// refusal on the node, because only it can recognise the combination; what is left is either an
// AND to walk into, or a single clause to look up by its key. An OR is not walked, because its
// branches are alternatives and a row of filter pills can only say AND.
export function parseNodeToPredicates<TFields extends Record<string, FilterField>>(
  node: AstNode,
  fields: TFields,
  timezone: string,
): ParsedPredicate[] {
  const addressed = dispatchCompoundNode(node, fields, timezone);

  if (addressed) {
    return [addressed];
  }

  const compound = getCompound(node);

  if (compound?.operator === '$and') {
    return compound.children.flatMap((child) => parseNodeToPredicates(child, fields, timezone));
  }

  return dispatchSimpleNodes([node], fields, timezone);
}

// Whether the field still advertises the operator this predicate uses. A saved filter can name a
// pairing the UI no longer offers, and those are dropped rather than shown as a pill the user
// cannot operate.
export function isPredicateEnabled<TFields extends Record<string, FilterField>>(
  predicate: ParsedPredicate,
  fields: TFields,
): boolean {
  const resolved = resolveField(fields, predicate.field, 'UTC');

  return resolved ? listsOperator(resolved.definition.operators, predicate.operator) : false;
}

function canonicalizeClauses(clauses: string[]): string[] {
  return [...clauses].sort((left, right) => left.localeCompare(right));
}

export function serializePredicates<TFields extends Record<string, FilterField>>(
  predicates: FilterPredicate[],
  fields: TFields,
  timezone: string,
): string | undefined {
  const clauses = predicates.flatMap((predicate) => {
    const resolved = resolveField(fields, predicate.field, timezone);

    if (!resolved) {
      return [];
    }

    return resolved.definition.codec.serialize(predicate, resolved.context) ?? [];
  });

  if (!clauses.length) {
    return undefined;
  }

  return canonicalizeClauses(clauses).join('+');
}
