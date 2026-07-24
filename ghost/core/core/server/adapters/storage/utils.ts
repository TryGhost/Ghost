import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';

/**
 * @TODO: move `events.js` to here - e.g. storageUtils.getStorage
 */

/**
 * Sanitizes a given URL or path for an image to be readable by the local file
 * storage, as storage needs the path without the `/content/images/` prefix.
 *
 * Takes a url or filepath and returns a filepath which is readable for the
 * local file storage.
 */
export function getLocalImagesStoragePath(imagePath: string): string {
    // The '/' in urlJoin is necessary to add the '/' to `content/images`, if no subdirectory is setup
    const urlRegExp = new RegExp(`^${urlUtils.urlJoin(
        urlUtils.urlFor('home', true),
        urlUtils.getSubdir(),
        '/',
        urlUtils.STATIC_IMAGE_URL_PREFIX)}`
    );

    const filePathRegExp = new RegExp(`^${urlUtils.urlJoin(
        urlUtils.getSubdir(),
        '/',
        urlUtils.STATIC_IMAGE_URL_PREFIX)}`
    );

    if (imagePath.match(urlRegExp)) {
        return imagePath.replace(urlRegExp, '');
    } else if (imagePath.match(filePathRegExp)) {
        return imagePath.replace(filePathRegExp, '');
    } else {
        return imagePath;
    }
}

/**
 * Compares the imagePath with a regex that reflects our local file storage
 *
 * @param imagePath as URL or filepath
 */
export function isLocalImage(imagePath: string): boolean {
    return getLocalImagesStoragePath(imagePath) !== imagePath;
}

/**
 * Checks whether the image is managed by Ghost storage (local or CDN)
 *
 * @param imagePath as URL or filepath
 */
export function isInternalImage(imagePath: string): boolean {
    if (isLocalImage(imagePath)) {
        return true;
    }

    const imageBaseUrl = (config.get('urls:image') || '').replace(/\/+$/, '');
    return !!(imageBaseUrl && imagePath.startsWith(imageBaseUrl + '/'));
}
