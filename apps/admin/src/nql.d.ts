declare module '@tryghost/nql' {
    interface NqlExpansion {
        key: string;
        replacement: string;
        expansion?: string;
    }

    interface NqlOptions {
        expansions?: NqlExpansion[];
    }

    interface NqlQuery {
        /**
         * Throws on an unparseable filter — the parse is lazy, so building the
         * query is not enough to know the filter is valid.
         */
        queryJSON(value: unknown): boolean;
    }

    export default function nql(filter: string, options?: NqlOptions): NqlQuery;
}
