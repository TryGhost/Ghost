import MembersManagementRoute from '../members-management';
import {inject as service} from '@ember/service';

export default class MembersImportRoute extends MembersManagementRoute {
    @service feature;
    @service router;

    beforeModel(transition) {
        const nextTransition = super.beforeModel(...arguments);

        if (nextTransition) {
            return nextTransition;
        }

        if (this.feature.membersForward) {
            const queryString = new URLSearchParams(transition?.to?.queryParams || {}).toString();
            const path = queryString ? `/members/import?${queryString}` : '/members/import';

            return this.router.replaceWith(path);
        }
    }
}
