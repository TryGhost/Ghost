export class URI extends URL {
    static readonly BASE_URL = new URL('https://example.com');

    constructor(url: string | URI, base?: string | URI) {
        super(url, base || URI.BASE_URL);
    }

    getValue(url: URL) {
        return this.href.replace(URI.BASE_URL.href, url.href);
    }
}
