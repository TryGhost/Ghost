export type AstNode = Record<string, unknown>;

export function isAstNode(value: unknown): value is AstNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof RegExp)
  );
}

export function getCompoundChildren(node: AstNode, operator: '$and' | '$or'): AstNode[] | null {
  const children = node[operator];

  if (!Array.isArray(children) || !children.every(isAstNode)) {
    return null;
  }

  return children;
}

export function readNegatedString(value: unknown): string | null {
  if (!isAstNode(value)) {
    return null;
  }

  return typeof value.$ne === 'string' ? value.$ne : null;
}

export function extractFieldName(node: AstNode): string | undefined {
  const keys = Object.keys(node);

  if (keys.length !== 1) {
    return undefined;
  }

  const [field] = keys;

  if (field.startsWith('$')) {
    return undefined;
  }

  return field;
}

export function toComparator(value: unknown): { operator: string; value: unknown } | undefined {
  if (isAstNode(value)) {
    const entries = Object.entries(value);

    if (entries.length !== 1) {
      return undefined;
    }

    const [operator, comparatorValue] = entries[0];
    return { operator, value: comparatorValue };
  }

  return {
    operator: '$eq',
    value,
  };
}

export function extractComparator(
  node: AstNode,
): { field: string; operator: string; value: unknown } | undefined {
  const field = extractFieldName(node);

  if (!field) {
    return undefined;
  }

  const comparator = toComparator(node[field]);

  if (!comparator) {
    return undefined;
  }

  return { field, ...comparator };
}
