/**
 * The editor's own requests opt out of the transport's session-expiry redirect:
 * leaving the page would take unsaved content with it, so the editor surfaces an
 * expired session itself. Shell boot reads keep the redirect, as on every screen.
 */
export const EDITOR_REQUEST_OPTIONS = { sessionExpiryRedirect: false } as const;
