export interface AccessItem {
  title: string;
  description?: string;
}

/**
 * Every app reads through the signed-in staff user's session for now, limited to what the
 * bridge allows. Keep this copy true to that; when apps get their own scoped access
 * (Permissions and auth), each scope becomes another item.
 */
export const STAFF_SESSION_ACCESS: AccessItem = {
  title:
    'This app uses your account, so it has the same access to your site as you do, even if this app only needs part of it. Only install this app if you trust the developer.',
};
