import {useRouting} from '@tryghost/admin-x-framework/routing';

// Seam over the legacy RoutingProvider: call sites depend on this hook so the
// router swap can happen here without touching them again.
export function useSettingsNavigation() {
    const {route, updateRoute, loadingModal} = useRouting();
    return {route, updateRoute, loadingModal};
}
