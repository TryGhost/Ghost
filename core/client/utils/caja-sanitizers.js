/**
 * google-caja uses url() and id() to verify if the values are allowed.
 */
var url,
    id;

/**
 * Check if URL is allowed
 * URLs are allowed if they start with http://, https://, or /.
 */
url = function (url) {
    // jscs:disable
    url = url.toString().replace(/['"]+/g, '');
    if (/^https?:\/\//.test(url) || /^\//.test(url)) {
        return url;
    }
    // jscs:enable
};

/**
 * Check if ID is allowed
 * All ids are allowed at the moment.
 */
id = function (id) {
    return id;
};

export default {
    url: url,
    id: id
};
