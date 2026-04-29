import {Filter} from '@tryghost/shade/patterns';

// TODO: Remove this file after the comment filters migration has safely rolled out.
const LEGACY_COMMENT_FILTER_FIELDS = ['status', 'created_at', 'body', 'post', 'author', 'reported'] as const;
const LEGACY_OPERATOR_MAP: Record<string, string> = {
    is_not: 'is-not',
    not_contains: 'does-not-contain'
};

function parseLegacyFilterValue(queryValue: string): {operator: string; value: string} | null {
    const colonIndex = queryValue.indexOf(':');

    if (colonIndex <= 0) {
        return null;
    }

    const operator = queryValue.substring(0, colonIndex);
    const value = queryValue.substring(colonIndex + 1);

    if (!value) {
        return null;
    }

    return {
        operator: LEGACY_OPERATOR_MAP[operator] ?? operator,
        value
    };
}

export function parseLegacyCommentFilters(searchParams: URLSearchParams): Filter[] {
    const filters: Filter[] = [];

    for (const [field, queryValue] of searchParams.entries()) {
        if (!LEGACY_COMMENT_FILTER_FIELDS.includes(field as typeof LEGACY_COMMENT_FILTER_FIELDS[number])) {
            continue;
        }

        const parsed = parseLegacyFilterValue(queryValue);

        if (!parsed) {
            continue;
        }

        filters.push({
            id: `${field}:${filters.length + 1}`,
            field,
            operator: parsed.operator,
            values: [parsed.value]
        });
    }

    return filters;
}

export function removeLegacyCommentFilterParams(searchParams: URLSearchParams): void {
    LEGACY_COMMENT_FILTER_FIELDS.forEach(field => searchParams.delete(field));
}
