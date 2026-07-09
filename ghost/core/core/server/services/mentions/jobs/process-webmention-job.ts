/** Processes a received webmention; extra fields are the sender's arbitrary form params. */
export default class ProcessWebmentionJob {
    static type = 'process-webmention';

    readonly data: {source: string; target: string} & Record<string, unknown>;

    constructor(data: {source: string; target: string} & Record<string, unknown>) {
        this.data = data;
    }
}
