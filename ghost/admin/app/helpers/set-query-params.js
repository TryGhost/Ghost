import {helper} from '@ember/component/helper';

/**
 * Usage:
 * 
 * ```hbs
 * {{set-url-query 'https://myurl.com' utm_source='admin'}}
 * ```
 * 
 * This example will return https://myurl.com?utm_source=admin
 * 
 * You can set every query/search parameter you want. It will override existing paramters if they are already set.
 */
export function setQueryParams([url], parameters) {
    if (url) {
        // Do some magic
        try {
            const parsed = new URL(url);
            for (const key of Object.keys(parameters)) {
                parsed.searchParams.set(key, parameters[key]);
            }
            return parsed.href;
        } catch (e) {
            // Invalid url. Just pass the original.
            // eslint-disable-next-line no-console
            console.error(e);
            return url;
        }
    }

    return '';
}

export default helper(setQueryParams);
