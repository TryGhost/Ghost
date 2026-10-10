import { useLocation } from '@tryghost/admin-x-framework';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useIsMobile } from '@tryghost/shade/utils';

/** View site with its Customize panel open: the panel's state lives in the URL, so Back closes it. */
export const CUSTOMIZE_SITE_PATH = '/site?customize';
export const VIEW_SITE_PATH = '/site';

/**
 * Whether the site's design can be customized from View site: an admin7Design
 * experiment on desktop, for staff who can edit the design (the design
 * settings are Administrator-only on the server).
 */
export function useCanCustomizeSite(): boolean {
  const admin7Design = useFeatureFlag('admin7Design');
  const isMobile = useIsMobile();
  const { data: currentUser } = useCurrentUser();
  return admin7Design && !isMobile && Boolean(currentUser && hasAdminAccess(currentUser));
}

/** Whether View site's Customize panel is open. */
export function useIsCustomizingSite(): boolean {
  const { pathname, search } = useLocation();
  return pathname === VIEW_SITE_PATH && new URLSearchParams(search).has('customize');
}
