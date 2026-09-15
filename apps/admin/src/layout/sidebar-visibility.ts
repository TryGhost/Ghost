import { type AdminRouteHandle, useMatches } from '@tryghost/admin-x-framework';
import { useSidebarVisibility as useEmberSidebarVisibility } from '@/ember-bridge';
import { useFlagGatedRouteOwner } from '@/use-flag-gated-route-owner';

export type SidebarRouteHandle = AdminRouteHandle & {
  allowEmberSidebarControl?: boolean;
};

function hidesAdminSidebar(handle: unknown): handle is AdminRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'hideAdminSidebar' in handle &&
    handle.hideAdminSidebar === true
  );
}

function allowsEmberSidebarControl(handle: unknown): handle is SidebarRouteHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    'allowEmberSidebarControl' in handle &&
    handle.allowEmberSidebarControl === true
  );
}

export function useAdminSidebarVisibility(): boolean {
  const emberSidebarVisible = useEmberSidebarVisibility();
  const editorOwner = useFlagGatedRouteOwner('editorReact');
  const postsListOwner = useFlagGatedRouteOwner('postsListReact');
  const matches = useMatches();

  // When both sides of the editor -> list transition are Ember-owned, Ember's
  // ui service has the earliest knowledge of the destination. React still
  // matches /editor/* while the list model is loading, so its route handle
  // must yield to Ember or the sidebar appears only after the URL settles.
  const emberControlsEditorNavigation = editorOwner === 'ember' && postsListOwner === 'ember';
  const routeHidesSidebar = matches.some((match) => {
    if (!hidesAdminSidebar(match.handle)) {
      return false;
    }

    return !(allowsEmberSidebarControl(match.handle) && emberControlsEditorNavigation);
  });

  return emberSidebarVisible && !routeHidesSidebar;
}
