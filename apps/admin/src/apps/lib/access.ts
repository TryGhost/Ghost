export interface AccessItem {
  title: string;
  description?: string;
}

/**
 * In this slice every app reads through the signed-in staff user's session, and
 * only what the bridge allows (READABLE_RESOURCES in ./bridge, read-only). Keep
 * this copy true to that; when apps get their own scoped access, revisit it.
 */
export const STAFF_SESSION_ACCESS: AccessItem = {
  title:
    'This app uses your account, so it has the same access to your site as you do, even if this app only needs part of it. Only install this app if you trust the developer.',
};
