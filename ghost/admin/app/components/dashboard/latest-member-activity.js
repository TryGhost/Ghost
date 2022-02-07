import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class DashboardLatestMemberActivityComponent extends Component {
    @service feature;
    @service session;
    @service settings;

    get shouldDisplay() {
        if (this.feature.improvedOnboarding) {
            return true;
        }

        const isOwner = this.session.user?.isOwnerOnly;
        const hasCompletedLaunchWizard = this.settings.get('editorIsLaunchComplete');

        if (isOwner && !hasCompletedLaunchWizard) {
            return false;
        }

        return true;
    }
}
