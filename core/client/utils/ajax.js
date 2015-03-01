/* global ic */

var ajax = function () {
    return ic.ajax.request.apply(null, arguments);
};

// Used in API request fail handlers to parse a standard api error
// response json for the message to display
function getRequestErrorMessage(request, performConcat) {
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
                });
            } else {
                message =  request.responseJSON.error || '未知错误（ 反馈QQ群: 335978388 ）';
            }
        } catch (e) {
            msgDetail = request.status ? request.status + ' - ' + request.statusText : '服务器挂了（ 反馈QQ群: 335978388 ）';
            message = '服务返回错误 (' + msgDetail + ')。（ 反馈QQ群: 335978388 ）';
        }
    }

    if (performConcat && Ember.isArray(message)) {
        message = message.join('<br />');
    }

    // return an array of errors by default
    if (!performConcat && typeof message === 'string') {
        message = [message];
    }

    return message;
}

export {getRequestErrorMessage, ajax};
export default ajax;
