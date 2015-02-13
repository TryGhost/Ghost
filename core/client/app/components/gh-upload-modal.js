import ModalDialog from 'ghost/components/gh-modal-dialog';
import upload from 'ghost/assets/lib/uploader';
import cajaSanitizers from 'ghost/utils/caja-sanitizers';

var UploadModal = ModalDialog.extend({
    layoutName: 'components/gh-modal-dialog',

    didInsertElement: function () {
        this._super();
        upload.call(this.$('.js-drop-zone'), {fileStorage: this.get('config.fileStorage')});
    },
    keyDown: function () {
        this.setErrorState(false);
    },
    setErrorState: function (state) {
        if (state) {
            this.$('.js-upload-url').addClass('error');
        } else {
            this.$('.js-upload-url').removeClass('error');
        }
    },
    confirm: {
        reject: {
            func: function () { // The function called on rejection
                return true;
            },
            buttonClass: 'btn btn-default',
            text: 'Cancel' // The reject button text
        },
        accept: {
            buttonClass: 'btn btn-blue right',
            text: 'Save', // The accept button text: 'Save'
            func: function () {
                var imageType = 'model.' + this.get('imageType'),
                    value;

                if (this.$('.js-upload-url').val()) {
                    value = this.$('.js-upload-url').val();

                    if (!Ember.isEmpty(value) && !cajaSanitizers.url(value)) {
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
        closeModal: function () {
            this.sendAction();
        },
        confirm: function (type) {
            var result,
                func = this.get('confirm.' + type + '.func');

            if (typeof func === 'function') {
                result = func.apply(this);
            }

            if (!result.message) {
                this.sendAction();
                this.sendAction('confirm' + type);
            }
        }
    }
});

export default UploadModal;
