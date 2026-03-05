export interface UrlPredicate {
    id: string;
    field: string;
    operator: string;
    values: string[];
}

interface SerializePredicateParamsInput {
    predicates: UrlPredicate[];
    multiselectFields: Set<string>;
    search?: string;
}

interface ParsePredicateParamsInput {
    params: URLSearchParams;
    multiselectFields: Set<string>;
    ignoredFields?: Set<string>;
}

function parseOperatorAndValue(queryValue: string): {operator: string; value: string} | undefined {
    const colonIndex = queryValue.indexOf(':');

    if (colonIndex <= 0) {
        return undefined;
    }

    return {
        operator: queryValue.substring(0, colonIndex),
        value: queryValue.substring(colonIndex + 1)
    };
}

export function serializePredicateParams({predicates, multiselectFields, search}: SerializePredicateParamsInput): URLSearchParams {
    const params = new URLSearchParams();

    for (const predicate of predicates) {
        const value = multiselectFields.has(predicate.field)
            ? predicate.values.join(',')
            : (predicate.values[0] ?? '');

        params.append(predicate.field, `${predicate.operator}:${value}`);
    }

    if (search?.trim()) {
        params.set('search', search);
    }

    return params;
}

export function parsePredicateParams({params, multiselectFields, ignoredFields = new Set()}: ParsePredicateParamsInput): UrlPredicate[] {
    const predicates: UrlPredicate[] = [];
    let index = 0;

    for (const [field, queryValue] of params.entries()) {
        if (ignoredFields.has(field)) {
            continue;
        }

        const parsed = parseOperatorAndValue(queryValue);

        if (!parsed) {
            continue;
        }

        const values = multiselectFields.has(field)
            ? (parsed.value ? parsed.value.split(',') : [])
            : [parsed.value];

        index += 1;
        predicates.push({
            id: `${field}-${index}`,
            field,
            operator: parsed.operator,
            values
        });
    }

    return predicates;
}
