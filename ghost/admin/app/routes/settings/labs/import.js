import AdminRoute from 'ghost-admin/routes/admin';
import ImportContentModal from '../../../components/modal-import-content';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class LabsImportRoute extends AdminRoute {
    @service modals;

    importModal = null;

    setupController() {
        this.importModal?.close();

        this.importModal = this.modals.open(ImportContentModal, {}, {
            className: 'fullscreen-modal fullscreen-modal-action fullscreen-modal-import-content',
            beforeClose: this.beforeModalClose
        });
    }

    @action
    async beforeModalClose() {
        this.router.transitionTo('settings.labs');
        return true;
    }
}
