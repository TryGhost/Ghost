import Ember from 'ember';

const {isArray} = Ember;

// Used in API request fail handlers to parse a standard api error
// response json for the message to display
export default function getRequestErrorMessage(request, performConcat) {
    let message,
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
            if (request.responseJSON.errors && isArray(request.responseJSON.errors)) {
                message = request.responseJSON.errors.map((errorItem) => {
                    return errorItem.message;
                });
            } else {
                message =  request.responseJSON.error || 'Unknown Error';
            }
        } catch (e) {
            msgDetail = request.status ? `${request.status} - ${request.statusText}` : 'Server was not available';
            message = `The server returned an error (${msgDetail}).`;
        }
    }

    if (performConcat && isArray(message)) {
        message = message.join('<br />');
    }

    // return an array of errors by default
    if (!performConcat && typeof message === 'string') {
        message = [message];
    }

    return message;
}
