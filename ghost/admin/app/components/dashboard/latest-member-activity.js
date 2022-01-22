import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class DashboardLatestMemberActivityComponent extends Component {
    @service session;
    @service settings;

    get shouldDisplay() {
        const isOwner = this.session.user?.isOwnerOnly;
        const hasCompletedLaunchWizard = this.settings.get('editorIsLaunchComplete');

        if (isOwner && !hasCompletedLaunchWizard) {
            return false;
        }

        return true;
    }
}
