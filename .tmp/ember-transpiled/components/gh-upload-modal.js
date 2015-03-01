define("ghost/components/gh-upload-modal", 
  ["ghost/components/gh-modal-dialog","ghost/assets/lib/uploader","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var ModalDialog = __dependency1__["default"];
    var upload = __dependency2__["default"];

    var UploadModal = ModalDialog.extend({
        layoutName: 'components/gh-modal-dialog',

        didInsertElement: function () {
            this._super();
            upload.call(this.$('.js-drop-zone'), {fileStorage: this.get('config.fileStorage')});
        },
        confirm: {
            reject: {
                func: function () { // The function called on rejection
                    return true;
                },
                buttonClass: 'btn btn-default',
                text: '取消' // The reject button text
            },
            accept: {
                buttonClass: 'btn btn-blue right',
                text: '保存', // The accept button texttext: 'Save'
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
                this.sendAction('confirm' + type);
            }
        }
    });

    __exports__["default"] = UploadModal;
  });