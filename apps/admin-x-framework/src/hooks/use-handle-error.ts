import * as Sentry from '@sentry/react';
import {showToast} from '@tryghost/admin-x-design-system';
import {toast as sonnerToast} from 'sonner';
import {useCallback} from 'react';
import toast from 'react-hot-toast';
import {useFramework} from '../providers/framework-provider';
import {APIError, getErrorMessage} from '../utils/errors';

// Stale toasts can cover UI (and block clicks in tests), so both outlets are
// cleared before showing a new toast - and on the unmocked-request test path
function dismissToasts() {
    toast.remove();
    sonnerToast.dismiss();
}

// There are two toast outlets: admin-x-design-system's DesignSystemProvider
// renders react-hot-toast (marked with this class), shade's ShadeProvider
// renders sonner - and the React shell can mount both at once. The marker's
// presence in the DOM picks the library to emit to.
function showErrorToast(message: React.ReactNode) {
    dismissToasts();
    if (document.querySelector('.toast-outlet-react-hot-toast')) {
        showToast({
            message,
            type: 'error'
        });
    } else {
        sonnerToast.error(message);
    }
}

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

        if (error instanceof APIError && error.response?.status === 418) {
            // We use this status in tests to indicate the API request was not mocked -
            // don't show a toast because it may block clicking things in the test,
            // but still clear lingering toasts that would block clicks the same way
            dismissToasts();
        } else if (error instanceof APIError) {
            // getErrorMessage extracts the human-readable text from
            // validation errors and falls back to the error's own message
            showErrorToast(getErrorMessage(error, error.message));
        } else {
            showErrorToast('Something went wrong, please try again.');
        }
    }, [sentryDSN]);

    return handleError;
};

export default useHandleError;
