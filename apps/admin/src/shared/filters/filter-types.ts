export interface FilterPredicate {
    id: string;
    field: string;
    operator: string;
    values: unknown[];
}

export type ParsedPredicate = Omit<FilterPredicate, 'id'>;

export interface CodecContext {
    key: string;
    pattern: string;
    params: Record<string, string>;
    timezone: string;
}

export interface FilterCodec {
    parse: (node: unknown, ctx: CodecContext) => ParsedPredicate | null;
    serialize: (predicate: FilterPredicate, ctx: CodecContext) => string[] | null;
}

/** A column the list appends while a filter on this field is active. */
export interface ActiveColumn {
    key: string;
    label: string;
}

export interface ActiveColumnContext extends CodecContext {
    /**
     * The display name the domain resolved for this key, where the schema cannot hold one:
     * a publisher-defined field is named at runtime. Absent when the caller supplied no
     * names, or has none for this key — a resolver returns null rather than guess.
     */
    label?: string;
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
        /**
         * A field whose key is a pattern stands for many columns, one per key it matches,
         * so it resolves its column per instance from the matched params instead of
         * declaring a fixed one.
         */
        activeColumn?: ActiveColumn | ((context: ActiveColumnContext) => ActiveColumn | null);
        /**
         * What the list must ask the API to return for this field's column to hold values.
         *
         * Declared apart from the column, because the two questions are answerable at
         * different moments: whether to ask follows from the filter alone, while naming
         * the column can wait on data that arrives later. Tying them together would make
         * the list fetch once without the values and again once the names landed.
         */
        columnInclude?: string;
    };
    codec: FilterCodec;
}

export function defineFields<TFields extends Record<string, FilterField>>(fields: TFields): TFields {
    return fields;
}
