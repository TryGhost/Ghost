/** Sends webmentions for a published/updated post. */
export default class SendWebmentionsJob {
    static type = 'send-webmentions';

    readonly data: {url: string; html?: string; previousHtml?: string};

    constructor(data: {url: string; html?: string; previousHtml?: string}) {
        this.data = data;
    }
}
