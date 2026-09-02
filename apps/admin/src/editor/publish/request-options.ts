/**
 * The publish flow runs over an editor holding unsaved work, and shows every
 * failure in the modal itself: no request may navigate away or raise a toast.
 */
export const EDITOR_REQUEST_OPTIONS = {
  sessionExpiryRedirect: false,
  defaultErrorHandler: false,
} as const;

/** `fetchApi` takes only the redirect opt-out; error handling is the caller's. */
export const EDITOR_FETCH_OPTIONS = {
  sessionExpiryRedirect: EDITOR_REQUEST_OPTIONS.sessionExpiryRedirect,
} as const;

/** Query hooks take only the error-handler opt-out. */
export const EDITOR_QUERY_OPTIONS = {
  defaultErrorHandler: EDITOR_REQUEST_OPTIONS.defaultErrorHandler,
} as const;
