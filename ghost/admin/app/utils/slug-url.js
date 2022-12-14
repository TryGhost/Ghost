import {isBlank} from '@ember/utils';

export default function SlugUrl(url, query) {
    if (query && !isBlank(query.slug)) {
        url += `slug/${query.slug}/`;
        delete query.slug;
    }

    return url;
}
