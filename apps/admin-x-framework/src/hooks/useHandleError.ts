import * as Sentry from '@sentry/react';
import {showToast} from '@tryghost/admin-x-design-system';
import {useCallback} from 'react';
import toast from 'react-hot-toast';
import {useFramework} from '../providers/FrameworkProvider';
import {APIError, ValidationError} from '../utils/errors';

/**
 * Generic error handling for API calls. This is enabled by default for queries (can be disabled by
 * setting defaultErrorHandler:false when using the query) but should be called when mutations throw
 * errors in order to handle anything unexpected.
 */
const useHandleError = () => {
    const {sentryDSN} = useFramework();

    /**
     * @param error Thrown error.
     * @param options.withToast Show a toast with the error message (default: true).
     *  In general we should validate on the client side before sending the request to avoid errors,
     *  so this toast is intended as a worst-case fallback message when we don't know what else to do.
     *
     */
    const handleError = useCallback((error: unknown, {withToast = true}: {withToast?: boolean} = {}) => {
        // eslint-disable-next-line no-console
        console.error(error);

        if (sentryDSN) {
            Sentry.withScope((scope) => {
                if (error instanceof APIError && error.response) {
                    scope.setTag('api_url', error.response.url);
                    scope.setTag('api_response_status', error.response.status);
                }
                Sentry.captureException(error);
            });
        }

        if (!withToast) {
            return;
        }

        toast.remove();

        if (error instanceof APIError && error.response?.status === 418) {
            // We use this status in tests to indicate the API request was not mocked -
            // don't show a toast because it may block clicking things in the test
        } else if (error instanceof ValidationError && error.data?.errors[0]) {
            showToast({
                message: error.data.errors[0].context || error.data.errors[0].message,
                type: 'error'
            });
        } else if (error instanceof APIError) {
            showToast({
                message: error.message,
                type: 'error'
            });
        } else {
            showToast({
                message: 'Something went wrong, please try again.',
                type: 'error'
            });
        }
    }, [sentryDSN]);

    return handleError;
};

export default useHandleError;
