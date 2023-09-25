import toast from 'react-hot-toast';
import {APIError, ValidationError} from '../errors';
import {showToast} from '../../admin-x-ds/global/Toast';

/**
 * Generic error handling for API calls. This is enabled by default for queries (can be disabled by
 * setting defaultErrorHandler:false when using the query) but should be called when mutations throw
 * errors in order to handle anything unexpected.
 *
 * @param error Thrown error.
 * @param options.withToast Show a toast with the error message (default: true).
 *  In general we should validate on the client side before sending the request to avoid errors,
 *  so this toast is intended as a worst-case fallback message when we don't know what else to do.
 * @returns
 */
const handleError = (error: unknown, {withToast = true}: {withToast?: boolean} = {}) => {
    // eslint-disable-next-line no-console
    console.error(error);

    if (!withToast) {
        return;
    }

    toast.remove();

    if (error instanceof ValidationError && error.data?.errors[0]) {
        showToast({
            message: error.data.errors[0].context || error.data.errors[0].message,
            type: 'pageError'
        });
    } else if (error instanceof APIError) {
        showToast({
            message: error.message,
            type: 'pageError'
        });
    } else {
        showToast({
            message: 'Something went wrong, please try again.',
            type: 'pageError'
        });
    }
};

export default handleError;
