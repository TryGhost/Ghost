import nql from '@tryghost/nql-lang';
import {resolveField} from './resolve-field';
import type {AstNode} from './filter-ast';
import type {FilterField, FilterPredicate, ParsedPredicate} from './filter-types';

export function parseFilterToAst(filter: string): AstNode | undefined {
    if (!filter) {
        return undefined;
    }

    try {
        return nql.parse(filter) as AstNode;
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
