import ModalComponent from 'ghost-admin/components/modal-base';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    config: service(),
    notifications: service(),
    settings: service(),

    willDestroyElement() {
        // reset any unsaved changes when closing
        this.settings.rollbackAttributes();
    },

    actions: {
        confirm() {
            // noop
        }
    },

    registerPreviewIframe: action(function (element) {
        this.previewIframe = element;
    }),

    replacePreviewContents: action(function (html) {
        if (this.previewIframe) {
            this.previewIframe.contentWindow.document.open();
            this.previewIframe.contentWindow.document.write(html);
            this.previewIframe.contentWindow.document.close();
        }
    }),

    saveTask: task(function* () {
        try {
            if (this.get('settings.errors').length !== 0) {
                return;
            }
            yield this.settings.save();
            this.closeModal();
            return true;
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error);
                throw error;
            }
        }
    })
});
