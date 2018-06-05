// TODO: figure out how to remove the need for this
// Add Request context parameter to the data object
// to be passed down to the templates
function setRequestIsSecure(req, data) {
    (Array.isArray(data) ? data : [data]).forEach(function forEach(d) {
        d.secure = req.secure;
    });
}

module.exports = setRequestIsSecure;
