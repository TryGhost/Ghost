import AdminRoute from 'ghost-admin/routes/admin';
import InstallThemeModal from '../../../../components/modals/design/install-theme';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class InstallThemeRoute extends AdminRoute {
    @service modals;
    @service router;

    redirect(model, transition) {
        const {source, ref} = transition.to.queryParams || {};

        if (!source || !ref) {
            this.transitionTo('settings.design.change-theme');
        }
    }

    // use `didTransition` rather than `activate` so that controller setup has completed
    @action
    didTransition() {
        const installController = this.controllerFor('settings.design.change-theme.install');
        const themesController = this.controllerFor('settings.design.change-theme');

        const theme = themesController.officialThemes.findBy('ref', installController.ref);

        this.installModal = this.modals.open(InstallThemeModal, {
            theme,
            ref: installController.ref,
            onSuccess: () => {
                this.showingSuccessModal = true;
                this.router.transitionTo('settings.design');
            }
        }, {
            beforeClose: this.beforeModalClose
        });
    }

    deactivate() {
        // leave install modal visible if it's in the success state because
        // we're switching over to the design customisation screen in the bg
        // and don't want to auto-close when this modal closes
        if (this.installModal && !this.showingSuccessModal) {
            this.installModal.close();
        }
    }

    @action
    beforeModalClose() {
        if (!this.showingSuccessModal) {
            this.transitionTo('settings.design.change-theme');
        }
        this.showingSuccessModal = false;
        this.installModal = null;
    }
}
