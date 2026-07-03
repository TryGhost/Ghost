/** Inlines external media into the site. Migrational, so no availability expectation during the run. */
export default class ExternalMediaInlinerJob {
    static type = 'external-media-inliner';

    readonly data: {domains: string[]};

    constructor(data: {domains: string[]}) {
        this.data = data;
    }
}
