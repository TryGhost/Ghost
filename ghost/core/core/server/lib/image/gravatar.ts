import crypto from 'node:crypto';
import tpl from '@tryghost/tpl';

type GravatarConfig = {
    get(key: 'gravatar'): {url: string};
    isPrivacyDisabled(key: 'useGravatar'): boolean;
};

type GravatarRequest = (url: string, options: {
    timeout: {
        request: number;
    };
}) => unknown;

type GravatarOptions = {
    [key: string]: number | string | undefined;
    default?: number | string;
    rating?: string;
    size?: number;
    _default?: number | string;
};

type GravatarUserData = {
    email: string;
};

type GravatarLookupResult = {
    image: string | undefined;
};

class Gravatar {
    config: GravatarConfig;
    request: GravatarRequest;

    constructor({config, request}: {config: GravatarConfig; request: GravatarRequest}) {
        this.config = config;
        this.request = request;
    }

    url(email: string, options: GravatarOptions): string {
        if (options.default) {
            // tpl errors on token `{default}` so we use `{_default}` instead
            // but still allow the option to be passed as `default`
            options._default = options.default;
        }
        const defaultOptions = {
            size: 250,
            _default: 'blank',
            rating: 'g'
        };
        const emailHash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
        const gravatarUrl = this.config.get('gravatar').url;
        return tpl(gravatarUrl, Object.assign(defaultOptions, options, {hash: emailHash}));
    }

    async lookup(userData: GravatarUserData, timeout?: number): Promise<GravatarLookupResult | undefined> {
        if (this.config.isPrivacyDisabled('useGravatar')) {
            return Promise.resolve(undefined);
        }

        // test existence using a default 404, but return a different default
        // so we still have a fallback if the image gets removed from Gravatar
        const testUrl = this.url(userData.email, {default: 404, rating: 'x'});
        const imageUrl = this.url(userData.email, {default: 'mp', rating: 'x'});

        try {
            await this.request(testUrl, {timeout: {request: timeout || 2 * 1000}});
            return {
                image: imageUrl
            };
        } catch (err: unknown) {
            const requestError = err as {statusCode?: unknown};
            if (requestError.statusCode === 404) {
                return {
                    image: undefined
                };
            }

            // ignore error, just resolve with no image url
        }
    }
}

module.exports = Gravatar;
