import type {Filter} from '@tryghost/shade';

export type UnstampedFilter = Omit<Filter, 'id'>;

export interface NqlContext {
    key: string;
    pattern: string;
    params: Record<string, string>;
    timezone: string;
}

export interface FilterFieldNql {
    fromNql?: (node: unknown, ctx: NqlContext) => UnstampedFilter | null;
    toNql: (filter: Filter, ctx: NqlContext) => string[] | null;
}

export interface FilterField {
    operators: readonly string[];
    parseKeys?: readonly string[];
    ui: {
        label: string;
        type: 'text' | 'select' | 'multiselect' | 'date' | 'number' | 'custom';
        [key: string]: unknown;
    };
    options?: Array<{value: string; label: string}>;
    metadata?: {
        activeColumn?: {
            key: string;
            label: string;
            include?: string;
        };
    };
    fromNql?: FilterFieldNql['fromNql'];
    toNql: FilterFieldNql['toNql'];
}

export function defineFields<TFields extends Record<string, FilterField>>(fields: TFields): TFields {
    return fields;
}
