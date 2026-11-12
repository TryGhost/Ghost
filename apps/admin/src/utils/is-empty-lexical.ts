interface LexicalNode {
  type?: string;
  children?: LexicalNode[];
}

interface LexicalState {
  root?: { children?: LexicalNode[] };
}

/**
 * Lexical data is considered empty if it has no children or only has an empty paragraph.
 */
export const isEmptyLexical = (lexical: string | null | undefined): boolean => {
  if (!lexical) {
    return true;
  }

  try {
    const parsed = JSON.parse(lexical) as LexicalState;
    const children = parsed?.root?.children;

    if (!children || children.length === 0) {
      return true;
    }
    if (
      children.length === 1 &&
      children[0].type === 'paragraph' &&
      (!children[0].children || children[0].children.length === 0)
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
};
