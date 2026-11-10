import * as Sentry from '@sentry/react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { APIError, SessionExpiredError, getErrorMessage } from '../utils/errors';

function showErrorToast(message: React.ReactNode) {
  toast.dismiss();
  toast.error(message);
}

/**
 * Generic error handling for API calls. This is enabled by default for queries (can be disabled by
 * setting defaultErrorHandler:false when using the query) but should be called when mutations throw
 * errors in order to handle anything unexpected.
 */
const useHandleError = () => {
  /**
   * @param error Thrown error.
   * @param options.withToast Show a toast with the error message (default: true).
   *  In general we should validate on the client side before sending the request to avoid errors,
   *  so this toast is intended as a worst-case fallback message when we don't know what else to do.
   * @param options.displayedMessage What the user is shown in place of the error's own message: in
   *  the toast, or by the caller without one. The report says the same.
   *
   */
  const handleError = useCallback(
    (
      error: unknown,
      {
        withToast = true,
        displayedMessage,
      }: { withToast?: boolean; displayedMessage?: string } = {},
    ) => {
      // eslint-disable-next-line no-console
      console.error(error);

      if (Sentry.getClient() && !(error instanceof SessionExpiredError)) {
        Sentry.withScope((scope) => {
          scope.setTag('source', 'useHandleError');
          // API errors reach the user through the toast or the caller's own message, which the
          // caller names when it isn't the error's own.
          const displayed =
            displayedMessage ??
            (error instanceof APIError ? getErrorMessage(error, error.message) : undefined);
          scope.setTag('shown_to_user', displayed !== undefined);
          if (displayed !== undefined) {
            scope.setContext('ghost', { displayed_message: displayed });
          }
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
        // but still clear lingering toasts that would block clicks the same way.
        toast.dismiss();
      } else if (error instanceof SessionExpiredError) {
        // Either the page is reloading to signin or nobody is signed in yet, so
        // there is nothing to report; toasts the signin flow shows must survive.
        return;
      } else if (displayedMessage !== undefined) {
        showErrorToast(displayedMessage);
      } else if (error instanceof APIError) {
        showErrorToast(getErrorMessage(error, error.message));
      } else {
        showErrorToast('Something went wrong, please try again.');
      }
    },
    [],
  );

  return handleError;
};

export default useHandleError;
