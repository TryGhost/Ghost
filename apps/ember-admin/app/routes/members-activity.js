import MembersManagementRoute from './members-management';
import {inject as service} from '@ember/service';

export default class MembersActivityRoute extends MembersManagementRoute {
    @service feature;
    @service router;

    beforeModel(transition) {
        const result = super.beforeModel(...arguments);
        if (!this.session.user?.canManageMembers || this.feature.membersActivityReact !== true) {
            return result;
        }

        transition.abort();

        // Named Ember transitions have not written the hash yet. Preserve the
        // member and event filters when handing that navigation to React.
        if (!transition.intent?.url) {
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries(transition.to?.queryParams ?? {})) {
                if (value !== null && value !== undefined && value !== '') {
                    query.set(key, String(value));
                }
            }
            const search = query.toString();
            this._navigateToReactRoute(`/members-activity${search ? `?${search}` : ''}`);
        }

        // Keep Ember's route state in sync so returning to the previous
        // Ember screen activates it again. Parking must not add history or
        // overwrite React Router's state and query parameters.
        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;
        if (parkedPath !== 'members-activity') {
            // Suppress the parking transition's URL update entirely. Restoring
            // the hash afterwards with replaceState is too late: React can
            // observe the queryless URL and keep it after that silent restore.
            this.router.replaceWith('react-fallback', 'members-activity').method(null);
        }
    }

    _navigateToReactRoute(url) {
        window.location.hash = url;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Activity',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
