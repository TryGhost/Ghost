export type AstNode = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof RegExp);
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

export function extractComparator(node: AstNode): {field: string; operator: string; value: unknown} | undefined {
    const field = extractFieldName(node);

    if (!field) {
        return undefined;
    }

    const value = node[field];

    if (isPlainObject(value)) {
        const entries = Object.entries(value);

        if (entries.length !== 1) {
            return undefined;
        }

        const [operator, comparatorValue] = entries[0];
        return {field, operator, value: comparatorValue};
    }

    return {
        field,
        operator: '$eq',
        value
    };
}
