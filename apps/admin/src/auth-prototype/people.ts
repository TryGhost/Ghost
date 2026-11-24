import { useBrowseSite } from '@tryghost/admin-x-framework/api/site';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { isOwnerUser, useBrowseUsers } from '@tryghost/admin-x-framework/api/users';

export const DEMO_OWNER_FALLBACK = 'zimo@acme.com';

/** The demo emails the sign-in screens know about. */
export const DEMO_EMAILS = {
  ssoUser: 'anna@acme.com',
  outsideDomain: 'sam@freelance.dev',
  newHire: 'new.hire@acme.com',
};

/**
 * The real owner's email. When you are the owner it comes from the current
 * user; otherwise from the staff list Admin already loads in Settings (the
 * same cached read).
 */
export function useOwnerEmail(): string {
  const { data: currentUser } = useCurrentUser();
  const currentIsOwner = currentUser ? isOwnerUser(currentUser) : false;
  const { data } = useBrowseUsers({ enabled: Boolean(currentUser) && !currentIsOwner });

  if (currentUser && currentIsOwner) {
    return currentUser.email;
  }
  const owner = data?.users.find((user) => isOwnerUser(user));
  return owner?.email ?? DEMO_OWNER_FALLBACK;
}

export function useSiteTitle(): string {
  const { data } = useBrowseSite({ defaultErrorHandler: false });
  return data?.site.title || 'your site';
}
