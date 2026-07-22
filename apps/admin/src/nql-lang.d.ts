declare module '@tryghost/nql-lang' {
    interface ParseOptions {
        preserveRelativeDates?: boolean;
    }

    const nql: {
        parse(input: string, options?: ParseOptions): unknown;
    };

    export default nql;
}
