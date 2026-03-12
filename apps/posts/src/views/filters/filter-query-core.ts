import nql from '@tryghost/nql-lang';
import {canonicalizeClauses} from './filter-normalization';
import {resolveField} from './resolve-field';
import type {FilterField, FilterPredicate, ParsedPredicate} from './filter-types';

type AstNode = Record<string, unknown>;

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

        for (const fieldKey of Object.keys(fields)) {
            const fallbackResolved = resolveField(fields, fieldKey, timezone);

            if (!fallbackResolved) {
                continue;
            }

            const parsed = fallbackResolved.definition.codec.parse(node, fallbackResolved.context);

            if (parsed) {
                return [parsed];
            }
        }

        return [];
    });
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
