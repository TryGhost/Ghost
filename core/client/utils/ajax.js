/* global ic */

var ajax = window.ajax = function () {
    return ic.ajax.request.apply(null, arguments);
};

// Used in API request fail handlers to parse a standard api error
// response json for the message to display
var getRequestErrorMessage = function (request) {
    var message,
        msgDetail;

    // Can't really continue without a request
    if (!request) {
        return null;
    }

    // Seems like a sensible default
    message = request.statusText;

    // If a non 200 response
    if (request.status !== 200) {
        try {
            // Try to parse out the error, or default to 'Unknown'
            if (request.responseJSON.errors && Ember.isArray(request.responseJSON.errors)) {

                message = request.responseJSON.errors.map(function (errorItem) {
                    return errorItem.message;
                }).join('; ');
            } else {
                message =  request.responseJSON.error || 'Unknown Error';
            }
        } catch (e) {
            msgDetail = request.status ? request.status + ' - ' + request.statusText : 'Server was not available';
            message = 'The server returned an error (' + msgDetail + ').';
        }
    }

    return message;
};

export { getRequestErrorMessage, ajax };
export default ajax;
