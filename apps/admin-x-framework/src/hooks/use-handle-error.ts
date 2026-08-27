import { useCallback } from 'react';
import { useFramework } from '../providers/framework-provider';
import { handleFrameworkError } from '../utils/handle-error';

/**
 * Generic error handling for API calls. This is enabled by default for queries (can be disabled by
 * setting defaultErrorHandler:false when using the query) but should be called when mutations throw
 * errors in order to handle anything unexpected.
 */
const useHandleError = () => {
  const { sentryDSN } = useFramework();

  /**
   * @param error Thrown error.
   * @param options.withToast Show a toast with the error message (default: true).
   *  In general we should validate on the client side before sending the request to avoid errors,
   *  so this toast is intended as a worst-case fallback message when we don't know what else to do.
   *
   */
  const handleError = useCallback(
    (error: unknown, { withToast = true }: { withToast?: boolean } = {}) => {
      handleFrameworkError(error, { sentryDSN, withToast });
    },
    [sentryDSN],
  );

  return handleError;
};

export default useHandleError;
