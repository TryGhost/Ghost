import fetch from 'fetch';
import oembedProviders from './oembed-providers';
import {Promise} from 'rsvp';

let filteredProviders;

// normalize the oembed.com providers list
// implemented as a memoized function rather than direct map to avoid parsing
// cost during initial JS load/parse.
export default function providers() {
    if (filteredProviders) {
        return filteredProviders;
    }

    filteredProviders = oembedProviders().map((provider) => {
        let {
            provider_name, // eslint-disable-line camelcase
            provider_url, // eslint-disable-line camelcase
            endpoints
        } = provider;

        let [endpoint] = endpoints;
        let {
            schemes = [],
            url
        } = endpoint;

        let hostname = new URL(url).hostname;
        let domain = hostname ? hostname.replace('www.', '') : '';

        return {
            // eslint-disable-next-line camelcase
            provider_name,
            // eslint-disable-next-line camelcase
            provider_url,
            schemes,
            domain,
            url
        };
    }).filter(provider => provider.domain !== '');

    return filteredProviders;
}

export function findProvider(url) {
    let candidates = providers().filter((provider) => {
        let {
            schemes,
            domain
        } = provider;

        if (!schemes.length) {
            return url.includes(domain);
        }

        return schemes.some((scheme) => {
            let reg = new RegExp(scheme.replace(/\*/g, '(.*)'), 'i');
            return url.match(reg);
        });
    });

    return candidates.length > 0 ? candidates[0] : null;
}

export function fetchEmbed(url, provider) {
    return new Promise((resolve, reject) => {
        let {
            provider_name, // eslint-disable-line camelcase
            provider_url, // eslint-disable-line camelcase
            url: resourceUrl
        } = provider;

        let link = `${resourceUrl}?format=json&url=${encodeURIComponent(url)}`;

        return fetch(link, {cache: 'no-cache', method: 'cors'}).then(res => res.json()).then((json) => {
            json.provider_name = provider_name; // eslint-disable-line camelcase
            json.provider_url = provider_url; // eslint-disable-line camelcase
            return resolve(json);
        }).catch(error => reject(error));
    });
}
