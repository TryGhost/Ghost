import AdminRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class AnnouncementBarRoute extends AdminRoute {
    @service customThemeSettings;
    @service feature;
    @service modals;
    @service settings;
    @service themeManagement;
    @service ui;
    @service session;
    @service store;

    model() {
        // background refresh of preview
        // not doing it on the 'index' route so that we don't reload going to/from the index,
        // any actions performed on child routes that need a refresh should trigger it explicitly
        this.themeManagement.updatePreviewHtmlTask.perform();

        // wait for settings to be loaded - we need the data to be present before display
        return Promise.all([
            this.settings.reload(),
            this.customThemeSettings.load(),
            this.store.findAll('theme')
        ]);
    }

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.transitionTo('settings.staff.user', user);
        }
    }

    activate() {
        this.ui.contextualNavMenu = 'announcement-bar';
    }

    deactivate() {
        this.ui.contextualNavMenu = null;
        this.confirmModal = null;
        this.hasConfirmed = false;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Announcement bar',
            mainClasses: ['gh-main-fullwidth']
        };
    }

    @action
    willTransition(transition) {
        if (this.hasConfirmed) {
            return true;
        }

        // always abort when not confirmed because Ember's router doesn't automatically wait on promises
        transition.abort();

        this.confirmUnsavedChanges().then((shouldLeave) => {
            if (shouldLeave === true) {
                this.hasConfirmed = true;
                return transition.retry();
            }
        });
    }

    confirmUnsavedChanges() {
        if (!this.settings.hasDirtyAttributes) {
            return Promise.resolve(true);
        }

        if (!this.confirmModal) {
            this.confirmModal = this.modals.open(ConfirmUnsavedChangesModal)
                .then((discardChanges) => {
                    if (discardChanges === true) {
                        this.settings.rollbackAttributes();
                    }
                    return discardChanges;
                }).finally(() => {
                    this.confirmModal = null;
                });
        }

        return this.confirmModal;
    }
}
