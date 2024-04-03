import Component from '@glimmer/component';
import DismissModal from './onboarding/dismiss-modal';
import ShareModal from './onboarding/share-modal';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class OnboardingChecklist extends Component {
    @service modals;
    @service onboarding;

    @inject config;

    dismissModal = null;
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

    @action
    async confirmDismiss() {
        this.dismissModal = this.modals.open(DismissModal, {}, {backgroundBlur: true});

        const reallyDismiss = await this.dismissModal;

        if (reallyDismiss === true) {
            this.onboarding.dismissChecklist();
        } else {
            this.dismissModal = null;
        }
    }
}
