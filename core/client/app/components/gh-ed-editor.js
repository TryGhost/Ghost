import Ember from 'ember';
import EditorAPI from 'ghost/mixins/ed-editor-api';
import EditorShortcuts from 'ghost/mixins/ed-editor-shortcuts';
import EditorScroll from 'ghost/mixins/ed-editor-scroll';
import ghostPaths from 'ghost/utils/ghost-paths';
import UploadUi from 'ghost/assets/lib/upload-ui';

export default Ember.TextArea.extend(EditorAPI, EditorShortcuts, EditorScroll, {
    focus: false,

    /**
     * Tell the controller about focusIn events, will trigger an autosave on a new document
     */
    focusIn: function () {
        this.sendAction('onFocusIn');
    },

    /**
     * Sets the focus of the textarea if needed
     */
    setFocus: function () {
        if (this.get('focus')) {
            this.$().val(this.$().val()).focus();
        }
    },

    /**
     * Sets up properties at render time
     */
    didInsertElement: function () {
        this._super();

        this.setFocus();

        this.sendAction('setEditor', this);

        this.attachFileHandler();

        Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
    },

    afterRenderEvent: function () {
        if (this.get('focus') && this.get('focusCursorAtEnd')) {
            this.setSelection('end');
        }
    },

    /**
     * Disable editing in the textarea (used while an upload is in progress)
     */
    disable: function () {
        var textarea = this.get('element');
        textarea.setAttribute('readonly', 'readonly');
    },

    /**
     * Binds the paste and drop events on the editor
     */
    attachFileHandler: function () {
        var self = this,
            fileUpload = this.$().fileupload(),
            dropSettings = {
                progressbar: true,
                editor: false
            },
            mimeTypes = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/gif': 'gif',
                'image/svg+xml': 'svg'
            },
            latestUpload;

        fileUpload.fileupload('option', {
            url: ghostPaths().apiRoot + '/uploads/',
            pasteZone: this.$(),
            dropZone: this.$(),
            paramName: 'uploadimage',
            add: function (e, data) {
                var selection = self.getSelection();
                self.replaceSelection('![uploading...]()', selection.start, selection.end, 'collapseToEnd');
                latestUpload = new UploadUi($('.js-drop-zone:contains("uploading...")'), dropSettings);
                latestUpload.initProgress(data);
            },
            submit: function (e, data) {
                var ext = '.jpg',
                    file = data.files[0];

                if (file.type && mimeTypes[file.type]) {
                    ext =  mimeTypes[file.type];
                }

                data.formData = {
                    filename: 'paste.' + ext
                };
            },
            paste: function (e, data) {
                self.$().fileupload('add', {files: data.files});
                e.preventDefault();
            },
            fail: function (e, data) {
                latestUpload.setError(data);
            },
            progressall: function (e, data) {
                latestUpload.setProgress(data);
            },
            done: function (e, data) {
                var filename = 'image',
                    result = data.result;

                if (result) {
                    filename = result.substring(result.lastIndexOf('/') + 1);
                }

                latestUpload.complete(result);
                self.set('value', self.get('value').replace('![uploading...]', '![' + filename + ']'));
            }
        });
    },

    /**
     * Reenable editing in the textarea
     */
    enable: function () {
        var textarea = this.get('element');
        textarea.removeAttribute('readonly');
    }
});
