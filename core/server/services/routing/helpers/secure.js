/**
 * @description Tiny/Weird helper to attach the information if the request is HTTPS or HTTP.
 *
 * It's used in services/url/utils (search for ".secure").
 *
 * We forward the resource into handlebars and if you use the URL helper, we want to know if the original request
 * was https or not to generate the correct URL...but that is only true, if your blog url is set to HTTP, but NGINX supports HTTPS.
 *
 * @TODO: Drop in Ghost 3.0, because we will only support https.
 * @param {Object} req
 * @param {Object} data
 */
function setRequestIsSecure(req, data) {
    (Array.isArray(data) ? data : [data]).forEach(function forEach(d) {
        d.secure = req.secure;
    });
}

module.exports = setRequestIsSecure;
