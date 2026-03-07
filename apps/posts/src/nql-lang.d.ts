declare module '@tryghost/nql-lang' {
    const nql: {
        parse: (input: string, options?: Record<string, unknown>) => unknown;
    };

    export default nql;
}
