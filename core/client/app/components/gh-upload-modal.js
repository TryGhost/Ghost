import Ember from 'ember';
import ModalDialog from 'ghost/components/gh-modal-dialog';
import upload from 'ghost/assets/lib/uploader';
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

const {inject, isEmpty} = Ember;

export default ModalDialog.extend({
    layoutName: 'components/gh-modal-dialog',

    config: inject.service(),

    didInsertElement() {
        this._super(...arguments);
        upload.call(this.$('.js-drop-zone'), {fileStorage: this.get('config.fileStorage')});
    },

    keyDown() {
        this.setErrorState(false);
    },

    setErrorState(state) {
        if (state) {
            this.$('.js-upload-url').addClass('error');
        } else {
            this.$('.js-upload-url').removeClass('error');
        }
    },

    confirm: {
        reject: {
            buttonClass: 'btn btn-default',
            text: 'Cancel', // The reject button text
            func() { // The function called on rejection
                return true;
            }
        },

        accept: {
            buttonClass: 'btn btn-blue right',
            text: 'Save', // The accept button text: 'Save'
            func() {
                let imageType = `model.${this.get('imageType')}`;
                let value;

                if (this.$('.js-upload-url').val()) {
                    value = this.$('.js-upload-url').val();

                    if (!isEmpty(value) && !cajaSanitizers.url(value)) {
                        this.setErrorState(true);
                        return {message: 'Image URI is not valid'};
                    }
                } else {
                    value = this.$('.js-upload-target').attr('src');
                }

                this.set(imageType, value);
                return true;
            }
        }
    },

    actions: {
        closeModal() {
            this.sendAction();
        },

        confirm(type) {
            let func = this.get(`confirm.${type}.func`);
            let result;

            if (typeof func === 'function') {
                result = func.apply(this);
            }

            if (!result.message) {
                this.sendAction();
                this.sendAction(`confirm${type}`);
            }
        }
    }
});
