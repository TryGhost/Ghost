import nql from '@tryghost/nql-lang';
import {resolveField} from './resolve-field';
import type {AstNode} from './filter-ast';
import type {Filter} from '@tryghost/shade';
import type {FilterField, UnstampedFilter} from './filter-types';

export function parseLegacyFilterToAst(filter: string): AstNode | undefined {
    if (!filter) {
        return undefined;
    }

    try {
        return nql.parse(filter) as AstNode;
    } catch {
        return undefined;
    }
}

export function stampImportedFilters(filters: UnstampedFilter[]): Filter[] {
    return filters.map((filter, index) => ({
        ...filter,
        id: `${filter.field}:${index + 1}`
    }));
}

export function importSimpleLegacyNodes<TFields extends Record<string, FilterField>>(nodes: AstNode[], fields: TFields, timezone: string): UnstampedFilter[] {
    return nodes.flatMap((node) => {
        const keys = Object.keys(node);

        if (keys.length !== 1 || keys[0].startsWith('$')) {
            return [];
        }

        const resolved = resolveField(fields, keys[0], timezone);

        if (resolved?.definition.fromNql) {
            const parsed = resolved.definition.fromNql(node, resolved.context);

            if (parsed) {
                return [parsed];
            }
        }

        return [];
    });
}
