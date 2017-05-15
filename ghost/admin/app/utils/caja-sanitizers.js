/**
 * google-caja uses url() and id() to verify if the values are allowed.
 */
/**
 * Check if URL is allowed
 * URLs are allowed if they start with http://, https://, or /.
 * NOTE: # urls are not allowed as clicking them will break the editor when clicked
 */
let url = function (url) {
    url = url.toString().replace(/['"]+/g, '');
    if (/^https?:\/\//.test(url) || /^\//.test(url)) {
        return url;
    }
};

/**
 * Check if ID is allowed
 * All ids are allowed at the moment.
 */
let id = function (id) {
    return id;
};

export default {
    url,
    id
};
