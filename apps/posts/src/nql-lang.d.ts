declare module '@tryghost/nql-lang' {
    const nql: {
        parse(input: string): unknown;
    };

    export default nql;
}
