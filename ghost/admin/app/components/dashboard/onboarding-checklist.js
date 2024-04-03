import Component from '@glimmer/component';
import ShareModal from './onboarding/share-modal';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class OnboardingChecklist extends Component {
    @service modals;
    @service onboarding;

    @inject config;

    shareModal = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.dismissModal?.close();
        this.shareModal?.close();
    }

    get siteUrl() {
        return this.config.blogTitle;
    }

    @action
    openShareModal() {
        this.onboarding.markStepCompleted('share-publication');
        this.shareModal = this.modals.open(ShareModal);
    }
}
