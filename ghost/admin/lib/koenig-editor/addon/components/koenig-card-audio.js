import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {TrackedObject} from 'tracked-built-ins';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {guidFor} from '@ember/object/internals';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';
export const AUDIO_EXTENSIONS = ['mp4', 'mp3', 'wav'];
export const AUDIO_MIME_TYPES = ['audio/mp4', 'audio/mpeg', 'audio/ogg'];

const PLACEHOLDERS = ['summer', 'mountains', 'ufo-attack'];

/* Payload
{
    src: 'https://ghostsite.com/media/...',
    fileName: '...',
    duration: 60,
    mimeType: 'audio/mp4',
    thumbnailSrc: 'https://ghostsite.com/content/media/...'
}
*/

// TODO: query file size limit from config and forbid uploads before they start

export default class KoenigCardAudioComponent extends Component {
    @service ajax;
    @service ghostPaths;

    @tracked files;
    @tracked thumbnailFiles;
    @tracked isDraggedOver = false;
    @tracked previewThumbnailSrc;

    // previewPayload stores all of the data collected until upload completes
    // at which point it will be saved to the real payload and the preview deleted
    @tracked previewPayload = new TrackedObject({});

    audioExtensions = AUDIO_EXTENSIONS;
    audioMimeTypes = AUDIO_MIME_TYPES;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;
    placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]

    payloadAudioAttrs = ['src', 'fileName', 'width', 'height', 'duration', 'mimeType', 'thumbnailSrc', 'thumbnailWidth', 'thumbnailHeight'];

    get isEmpty() {
        return isBlank(this.args.payload.src);
    }

    get isIncomplete() {
        const {src, thumbnailSrc} = this.args.payload;
        return isBlank(src) || isBlank(thumbnailSrc);
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
            this.triggerAudioFileDialog();
        }

        // payload.files will be present if we have an externally set audio that
        // should be uploaded. Typically from a paste or drag/drop
        if (files) {
            this.files = files;
        }
    }

    @action
    registerAudioFileInput(input) {
        this._audioFileInput = input;
    }

    @action
    registerAudioThumbnailFileInput(input) {
        this._audioThumbnailFileInput = input;
    }

    @action
    triggerAudioFileDialog(event) {
        if (this._audioFileInput) {
            return this._audioFileInput.click();
        }

        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        if (fileInput) {
            fileInput.click();
        }
    }

    @action
    triggerThumbnailFileDialog(event) {
        if (this._audioThumbnailFileInput) {
            return this._audioThumbnailFileInput.click();
        }

        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        if (fileInput) {
            fileInput.click();
        }
    }

    @action
    async audioUploadStarted() {
        // TODO: Placeholder for any processing on audio upload
    }

    @action
    async audioThumbnailUploadStarted() {
        // TODO: Placeholder for any processing on audio upload
    }

    prettifyFileName(filename) {
        let updatedName = filename.split('.').slice(0, -1).join('.').replace(/[-_]/g,' ').replace(/[^\w\s]+/g,'').replace(/\s\s+/g, ' ');
        return updatedName.charAt(0).toUpperCase() + updatedName.slice(1);
    }

    @action
    async audioUploadCompleted([audio]) {
        this.previewPayload.src = audio.url;
        this.previewPayload.fileName = this.prettifyFileName(audio.fileName);

        // save preview payload attrs into actual payload and create undo snapshot
        this.args.editor.run(() => {
            this.payloadAudioAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, this.previewPayload[attr]);
            });
        });

        // reset preview so we're back to rendering saved data
        this.previewPayload = new TrackedObject({});
    }

    @action
    async audioThumbnailUploadCompleted([thumb]) {
        const thumbnailGuid = Date.now().valueOf();
        this.previewPayload.thumbnailSrc = `${thumb.url}?v=${thumbnailGuid}`;

        // save preview payload attr into actual payload
        this.args.editor.run(() => {
            this.updatePayloadAttr('thumbnailSrc', this.previewPayload.thumbnailSrc);
        });

        // reset preview so we're back to rendering saved data
        this.previewPayload = new TrackedObject({});
    }

    @action
    audioUploadFailed() {
        // reset all attrs, creating an undo snapshot
        this.args.editor.run(() => {
            this.payloadAudioAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, null);
            });
        });
    }

    @action
    setAudioTitle(content) {
        this.updatePayloadAttr('fileName', content);
    }

    @action
    audioThumbnailUploadFailed() {
        this.previewPayload.thumbnailSrc = null;
        this.args.editor.run(() => {
            this.updatePayloadAttr('thumbnailSrc', this.previewPayload.thumbnailSrc);
        });
    }

    @task
    *uploadThumbnailFromBlobTask(audioUrl, fileBlob) {
        const formData = new FormData();
        formData.append('file', fileBlob, `media-thumbnail-${guidFor(this)}.jpg`);
        formData.append('url', audioUrl);

        const url = `${this.ghostPaths.apiRoot}/media/thumbnail/upload/`;

        const response = yield this.ajax.put(url, {
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'json'
        });

        return response.media[0].url;
    }

    @action
    toggleLoop() {
        this.updatePayloadAttr('loop', !this.args.payload.loop);
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
}
