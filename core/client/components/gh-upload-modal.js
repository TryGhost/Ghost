import ModalDialog from 'ghost/components/gh-modal-dialog';
import upload from 'ghost/assets/lib/uploader';

var UploadModal = ModalDialog.extend({
    layoutName: 'components/gh-modal-dialog',

    didInsertElement: function () {
        this._super();
        var filestorage = $('#general').data('filestorage');
        upload.call(this.$('.js-drop-zone'), {fileStorage: filestorage});
    },
    confirm: {
        reject: {
            func: function () { // The function called on rejection
                return true;
            },
            buttonClass: true,
            text: 'Cancel' // The reject button text
        },
        accept: {
            buttonClass: 'button-save right',
            text: 'Save', // The accept button texttext: 'Save'
            func: function () {
                var imageType = 'model.' + this.get('imageType');

                if (this.$('.js-upload-url').val()) {
                    this.set(imageType, this.$('.js-upload-url').val());
                } else {
                    this.set(imageType, this.$('.js-upload-target').attr('src'));
                }
                return true;
            }
        }
    },

    actions: {
        closeModal: function () {
            this.sendAction();
        },
        confirm: function (type) {
            var func = this.get('confirm.' + type + '.func');
            if (typeof func === 'function') {
                func.apply(this);
            }
            this.sendAction();
        }
    }
});

export default UploadModal;
