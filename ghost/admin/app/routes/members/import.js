import MembersManagementRoute from '../members-management';
import {inject as service} from '@ember/service';

export default class MembersImportRoute extends MembersManagementRoute {
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.feature.membersForward) {
            return this.replaceWith('react-fallback', 'members/import');
        }
    }
}
