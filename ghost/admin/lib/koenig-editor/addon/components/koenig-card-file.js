import Component from '@glimmer/component';
import prettifyFileName from '../utils/prettify-file-name';
import {TrackedObject} from 'tracked-built-ins';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';
const PLACEHOLDERS = ['summer', 'mountains', 'ufo-attack'];

/* Payload
{
    src: 'https://ghostsite.com/media/...',
    fileName: '...',
    fileSize: 2048,
    fileTitle: '...',
    fileCaption: '...',
    mimeType: '...'
}
*/

// TODO: query file size limit from config and forbid uploads before they start

export default class KoenigCardFileComponent extends Component {
    @service ajax;
    @service ghostPaths;

    @tracked files;
    @tracked isDraggedOver = false;

    // previewPayload stores all of the data collected until upload completes
    // at which point it will be saved to the real payload and the preview deleted
    @tracked previewPayload = new TrackedObject({});

    placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

    payloadFileAttrs = ['src', 'fileName', 'fileTitle', 'fileCaption', 'fileSize', 'mimeType'];

    get isEmpty() {
        return isBlank(this.args.payload.src);
    }

    get isIncomplete() {
        const {src} = this.args.payload;
        return isBlank(src);
    }

    get toolbar() {
        if (this.args.isEditing) {
            return false;
        }

        return {
            items: [{
                buttonClass: 'fw4 flex items-center white',
                icon: 'koenig/kg-edit',
                iconClass: 'fill-white',
                title: 'Edit',
                text: '',
                action: bind(this, this.args.editCard)
            }]
        };
    }

    get fileSize() {
        const sizeInBytes = this.args.payload.fileSize || this.previewPayload.fileSize;
        return this._bytesToSize(sizeInBytes);
    }

    get fileName() {
        return (this.args.payload.fileName || this.previewPayload.fileName) || '';
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {
            loop: false
        };

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this.updatePayloadAttr(key, value);
            }
        });
    }

    @action
    didInsert(element) {
        // required for snippet rects to be calculated - editor reaches in to component,
        // expecting a non-Glimmer component with a .element property
        this.element = element;

        const {triggerBrowse, src, files} = this.args.payload;

        // don't persist editor-only payload attrs
        delete this.args.payload.triggerBrowse;
        delete this.args.payload.files;

        // the editor will add a triggerBrowse payload attr when inserting from
        // the card menu to save an extra click needed to open the file dialog
        if (triggerBrowse && !src && !files) {
            this.triggerFileDialog();
        }

        // payload.files will be present if we have an externally set that
        // should be uploaded. Typically from a paste or drag/drop
        if (files) {
            this.files = files;
        }
    }

    @action
    triggerFileDialog(event) {
        if (this._fileInput) {
            return this._fileInput.click();
        }

        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        fileInput?.click();
    }

    @action
    async fileUploadStarted(files) {
        // extract metadata into temporary payload whilst file is uploading
        const file = files[0];
        if (file) {
            this.previewPayload.fileSize = file.size;
        }
    }

    @action
    async fileUploadCompleted([uploadedFile]) {
        this.previewPayload.src = uploadedFile.url;
        this.previewPayload.fileName = uploadedFile.fileName;
        this.previewPayload.fileTitle = prettifyFileName(uploadedFile.fileName);
        this.previewPayload.fileCaption = '';

        // save preview payload attrs into actual payload and create undo snapshot
        this.args.editor.run(() => {
            this.payloadFileAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, this.previewPayload[attr]);
            });
        });

        // reset preview so we're back to rendering saved data
        this.previewPayload = new TrackedObject({});
    }

    @action
    fileUploadFailed() {
        // reset all attrs, creating an undo snapshot
        this.args.editor.run(() => {
            this.payloadFileAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, null);
            });
        });
    }

    @action
    setFileTitle(content) {
        this.updatePayloadAttr('fileTitle', content);
    }

    @action
    setFileCaption(content) {
        this.updatePayloadAttr('fileCaption', content);
    }

    @action
    updatePayloadAttr(attr, value) {
        const {payload} = this.args;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard(payload, false);
    }

    @action
    dragOver(event) {
        if (!event.dataTransfer) {
            return;
        }

        event.stopPropagation();
        event.preventDefault();

        this.isDraggedOver = true;
    }

    @action
    dragLeave(event) {
        event.preventDefault();
        this.isDraggedOver = false;
    }

    @action
    drop(event) {
        event.preventDefault();
        event.stopPropagation();

        this.isDraggedOver = false;

        if (event.dataTransfer.files) {
            this.files = [event.dataTransfer.files[0]];
        }
    }

    _bytesToSize(bytes) {
        if (!bytes) {
            return '0 Byte';
        }
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) {
            return '0 Byte';
        }
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round((bytes / Math.pow(1024, i))) + ' ' + sizes[i];
    }
}
