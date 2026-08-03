// @tryghost/nql ships no types. Only the surface the round-trip tests need is
// declared here, rather than falling back to `any`.
declare module '@tryghost/nql' {
    interface NqlQuery {
        parse(): Record<string, unknown> & {$and?: Record<string, unknown>[]};
    }

    export default function nql(filter: string): NqlQuery;
}
