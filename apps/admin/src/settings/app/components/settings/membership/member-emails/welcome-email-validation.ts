export type WelcomeEmailDraft = {
    subject: string;
    lexical: string;
};

const isEmptyLexical = (lexical: string | null | undefined): boolean => {
    if (!lexical) {
        return true;
    }

    try {
        const parsed = JSON.parse(lexical);
        const children = parsed?.root?.children;

        // Empty if no children or only an empty paragraph
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

export const getWelcomeEmailValidationErrors = (state: WelcomeEmailDraft): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!state.subject?.trim()) {
        newErrors.subject = 'A subject is required';
    }

    if (isEmptyLexical(state.lexical)) {
        newErrors.lexical = 'Email content is required';
    }

    return newErrors;
};
