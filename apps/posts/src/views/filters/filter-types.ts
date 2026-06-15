export interface FilterPredicate {
    id: string;
    field: string;
    operator: string;
    values: unknown[];
}

export type ParsedPredicate = Omit<FilterPredicate, 'id'>;

export interface CodecContext {
    // Canonical field key the codec serializes to / reports predicates under.
    key: string;
    // The key actually matched in the source NQL — equals `key` for an exact or
    // pattern match, but is the alias (a `parseKeys` entry) when one was used.
    // Codecs additionally accept a node whose field is this key. Set by
    // `resolveField`; absent on hand-built contexts (which use canonical keys).
    matchedKey?: string;
    pattern: string;
    params: Record<string, string>;
    timezone: string;
}

export interface FilterCodec {
    parse: (node: unknown, ctx: CodecContext) => ParsedPredicate | null;
    serialize: (predicate: FilterPredicate, ctx: CodecContext) => string[] | null;
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
    codec: FilterCodec;
}

export function defineFields<TFields extends Record<string, FilterField>>(fields: TFields): TFields {
    return fields;
}
