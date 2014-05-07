/*global console */

import ModalDialog from 'ghost/components/modal-dialog';

var UploadModal = ModalDialog.extend({
    layoutName: 'components/modal-dialog',

    didInsertElement: function () {
        this._super();

        // @TODO: get this real
        console.log('UploadController:afterRender');
        // var filestorage = $('#' + this.options.model.id).data('filestorage');
        // this.$('.js-drop-zone').upload({fileStorage: filestorage});
    },

    actions: {
        closeModal: function () {
            this.sendAction();
        },
        confirm: function (type) {
            var func = this.get('confirm.' + type + '.func');
            if (typeof func === 'function') {
                func();
            }
            this.sendAction();
        }
    },

});

export default UploadModal;
