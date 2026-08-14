export type EmailDraft = {
    subject: string;
    lexical: string;
};

interface LexicalNode {
    type?: string;
    children?: LexicalNode[];
}

interface LexicalState {
    root?: {children?: LexicalNode[]};
}

/**
 * Lexical data is considered empty if it has no children or only has an empty paragraph.
 */
const isEmptyLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical) as LexicalState;
        const children = parsed?.root?.children;

        if (!children || children.length === 0) {
            return true;
        }
        if (children.length === 1 &&
            children[0].type === 'paragraph' &&
            (!children[0].children || children[0].children.length === 0)) {
            return true;
        }

        return false;
    } catch {
        return true;
    }
};

export const getEmailValidationErrors = (state: EmailDraft): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!state.subject?.trim()) {
        newErrors.subject = 'A subject is required';
    }

    if (isEmptyLexical(state.lexical)) {
        newErrors.lexical = 'Email content is required';
    }

    return newErrors;
};
