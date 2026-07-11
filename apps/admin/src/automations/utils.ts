interface LexicalNode {
    type?: string;
    children?: LexicalNode[];
}

interface LexicalState {
    root?: {children?: LexicalNode[]};
}

export const isEmptyEmailLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical) as LexicalState;
        const children = parsed?.root?.children;

        if (!children || children.length === 0) {
            return true;
        }

        return children.length === 1 && children[0].type === 'paragraph' && (!children[0].children || children[0].children.length === 0);
    } catch {
        return true;
    }
};