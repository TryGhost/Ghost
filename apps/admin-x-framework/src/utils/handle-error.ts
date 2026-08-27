import * as Sentry from '@sentry/react';
import { toast } from 'sonner';
import { APIError, SessionExpiredError, getErrorMessage } from './errors';

function showErrorToast(message: React.ReactNode) {
  toast.dismiss();
  toast.error(message);
}

export function handleFrameworkError(
  error: unknown,
  {
    sentryDSN,
    withToast = true,
  }: {
    sentryDSN: string | null;
    withToast?: boolean;
  },
) {
  // eslint-disable-next-line no-console
  console.error(error);

  if (sentryDSN && !(error instanceof SessionExpiredError)) {
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
    // but still clear lingering toasts that would block clicks the same way.
    toast.dismiss();
  } else if (error instanceof SessionExpiredError) {
    // Session-expiry 401s trigger a redirect to signin in the fetch
    // layer - a toast would only flash while the page unloads
    toast.dismiss();
  } else if (error instanceof APIError) {
    showErrorToast(getErrorMessage(error, error.message));
  } else {
    showErrorToast('Something went wrong, please try again.');
  }
}
