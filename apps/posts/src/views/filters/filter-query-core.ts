import nql from '@tryghost/nql-lang';
import {resolveField} from './resolve-field';
import type {AstNode} from './filter-ast';
import type {FilterField, FilterPredicate, ParsedPredicate} from './filter-types';

export function parseFilterToAst(filter: string): AstNode | undefined {
    if (!filter) {
        return undefined;
    }

    try {
        return nql.parse(filter, {preserveRelativeDates: true}) as AstNode;
    } catch {
        return undefined;
    }
}

export function stampPredicates(predicates: ParsedPredicate[]): FilterPredicate[] {
    return predicates.map((predicate, index) => ({
        ...predicate,
        id: `${predicate.field}:${index + 1}`
    }));
}

export function getFieldKeysByType<TFields extends Record<string, FilterField>>(
    fields: TFields,
    type: FilterField['ui']['type']
): Set<string> {
    const keys = new Set<string>();

    Object.entries(fields).forEach(([key, definition]) => {
        if (definition.ui.type !== type) {
            return;
        }

        keys.add(key);
        definition.parseKeys?.forEach(parseKey => keys.add(parseKey));
    });

    return keys;
}

export function hasFieldKey(node: AstNode, fieldKeys: ReadonlySet<string>): boolean {
    if (Object.keys(node).some(key => fieldKeys.has(key))) {
        return true;
    }

    return Object.values(node).some((value) => {
        if (Array.isArray(value)) {
            return value.some(child => child !== null && typeof child === 'object' && hasFieldKey(child as AstNode, fieldKeys));
        }

        return value !== null && typeof value === 'object' && !(value instanceof RegExp) && hasFieldKey(value as AstNode, fieldKeys);
    });
}

export function dispatchSimpleNodes<TFields extends Record<string, FilterField>>(nodes: AstNode[], fields: TFields, timezone: string): ParsedPredicate[] {
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

/**
 * Pulls repeated positive scalar clauses for the same field out of a grouped
 * AND's children, e.g. `(label:a+label:b)` → one all-of predicate. A field is
 * eligible when it declares the `is-all` operator; alias keys come from
 * `parseKeys`. Fields need at least two clauses to form a group — lone
 * clauses stay in `remaining`. Returns null when nothing qualifies.
 */
export function extractAllOfPredicates<TFields extends Record<string, FilterField>>(
    children: AstNode[],
    fields: TFields,
    timezone: string
): {predicates: ParsedPredicate[]; remaining: AstNode[]} | null {
    const clauses = children.map((child) => {
        const keys = Object.keys(child);
        const value = child[keys[0]];

        if (keys.length !== 1 || keys[0].startsWith('$') || typeof value !== 'string') {
            return {child, allOf: null};
        }

        const resolved = resolveField(fields, keys[0], timezone);

        if (!resolved?.definition.operators.includes('is-all')) {
            return {child, allOf: null};
        }

        return {child, allOf: {field: resolved.context.key, value}};
    });

    const clauseCounts = new Map<string, number>();

    for (const {allOf} of clauses) {
        if (allOf) {
            clauseCounts.set(allOf.field, (clauseCounts.get(allOf.field) ?? 0) + 1);
        }
    }

    const predicatesByField = new Map<string, ParsedPredicate>();
    const remaining: AstNode[] = [];

    for (const {child, allOf} of clauses) {
        if (!allOf || (clauseCounts.get(allOf.field) ?? 0) < 2) {
            remaining.push(child);
            continue;
        }

        const predicate = predicatesByField.get(allOf.field) ?? {field: allOf.field, operator: 'is-all', values: []};
        predicate.values.push(allOf.value);
        predicatesByField.set(allOf.field, predicate);
    }

    if (!predicatesByField.size) {
        return null;
    }

    return {predicates: [...predicatesByField.values()], remaining};
}

function canonicalizeClauses(clauses: string[]): string[] {
    return [...clauses].sort((left, right) => left.localeCompare(right));
}

export function serializePredicates<TFields extends Record<string, FilterField>>(predicates: FilterPredicate[], fields: TFields, timezone: string): string | undefined {
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
