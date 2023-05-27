import Component from '@glimmer/component';
import extractVideoMetadata from '../utils/extract-video-metadata';
import {IMAGE_EXTENSIONS, IMAGE_MIME_TYPES} from 'ghost-admin/components/gh-image-uploader';
import {TrackedObject} from 'tracked-built-ins';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {guidFor} from '@ember/object/internals';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv'];
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

const PLACEHOLDERS = ['summer', 'mountains', 'ufo-attack'];

/* Payload
{
    src: 'https://ghostsite.com/media/...',
    fileName: '...',
    width: 640,
    height: 480,
    duration: 60,
    mimeType: 'video/mp4'
    thumbnailSrc: 'https://ghostsite.com/images/...',
    thumbnailWidth: 640,
    thumbnailHeight: 640,
    customThumbnailSrc: 'https://ghostsite.com/images/...',
    customThumbnailWdith: 640,
    customThumbnailHeight: 480,
    cardWidth: 'normal|wide|full',
    loop: true|false (default: false)
}

`thumbnail*` are automatically generated client-side when a video is selected
*/

// TODO: query file size limit from config and forbid uploads before they start

export default class KoenigCardVideoComponent extends Component {
    @service ajax;
    @service ghostPaths;

    @tracked files;
    @tracked isDraggedOver = false;
    @tracked previewThumbnailSrc;

    // previewPayload stores all of the data collected until upload completes
    // at which point it will be saved to the real payload and the preview deleted
    @tracked previewPayload = new TrackedObject({});

    videoExtensions = VIDEO_EXTENSIONS;
    videoMimeTypes = VIDEO_MIME_TYPES;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)];

    payloadVideoAttrs = ['src', 'fileName', 'width', 'height', 'duration', 'mimeType', 'thumbnailSrc', 'thumbnailWidth', 'thumbnailHeight'];

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

    get aspectRatioPaddingStyle() {
        const {width, height} = this.args.payload || {};
        return htmlSafe(`padding-top: calc(${height} / ${width} * 100%)`);
    }

    get totalDuration() {
        let duration = this.args.payload.duration || this.previewPayload.duration;
        return this._getFormattedDuration(duration);
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
            this.triggerVideoFileDialog();
        }

        // payload.files will be present if we have an externally set video that
        // should be uploaded. Typically from a paste or drag/drop
        if (files) {
            this.files = files;
        }
    }

    @action
    registerVideoFileInput(input) {
        this._videoFileInput = input;
    }

    @action
    triggerVideoFileDialog(event) {
        if (this._videoFileInput) {
            return this._videoFileInput.click();
        }

        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        if (fileInput) {
            fileInput.click();
        }
    }

    @action
    async videoUploadStarted(files) {
        // extract metadata into temporary payload whilst video is uploading
        const file = files[0];
        if (file) {
            // use a task here so we can wait for it later if the upload is quicker
            const metadata = await this.extractVideoMetadataTask.perform(file);

            this.previewPayload.duration = metadata.duration;
            this.previewPayload.width = metadata.width;
            this.previewPayload.height = metadata.height;
            this.previewPayload.mimeType = metadata.mimeType;

            if (metadata.thumbnailBlob) {
                // show the thumbnail behind the progress bar whilst uploading
                if (!this.previewPayload.thumbnailSrc) {
                    this.previewThumbnailSrc = URL.createObjectURL(metadata.thumbnailBlob);
                }

                // store the thumbnail ready for upload once the video upload completes
                // TODO: update gh-uploader or switch approach to allow both files
                // to upload in the same request
                this._thumbnailBlob = metadata.thumbnailBlob;
            }
        }
    }

    @action
    async videoUploadCompleted([video]) {
        if (!video?.url && !video?.fileName || !video) {
            return; // prevents undefined error when upload fails, due to connection or server error.
        }
        this.previewPayload.src = video.url;
        this.previewPayload.fileName = video.fileName;
        await this.extractVideoMetadataTask.last;

        if (this._thumbnailBlob) {
            try {
                // upload thumbnail only once video is uploaded because we need to
                // provide the associated video url for the server to match video+thumbnail
                const thumbnailSrc = await this.uploadThumbnailFromBlobTask.perform(video.url, this._thumbnailBlob);
                this.previewPayload.thumbnailSrc = thumbnailSrc;
                this.previewPayload.thumbnailWidth = this.previewPayload.width;
                this.previewPayload.thumbnailHeight = this.previewPayload.height;
            } catch (e) {
                // thumbnail upload is optional, log the error and move on
                console.error(e); // eslint-disable-line
            } finally {
                this._thumbnailBlob = null;
                this.previewThumbnailSrc = null;
            }
        }

        // save preview payload attrs into actual payload and create undo snapshot
        this.args.editor.run(() => {
            this.payloadVideoAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, this.previewPayload[attr]);
            });
        });

        // reset preview so we're back to rendering saved data
        this.previewPayload = new TrackedObject({});
    }

    @action
    videoUploadFailed() {
        // reset all attrs, creating an undo snapshot
        this.args.editor.run(() => {
            this.payloadVideoAttrs.forEach((attr) => {
                this.updatePayloadAttr(attr, null);
            });
        });
    }

    @task
    *extractVideoMetadataTask(file) {
        return yield extractVideoMetadata(file);
    }

    @task
    *uploadThumbnailFromBlobTask(videoUrl, fileBlob) {
        const formData = new FormData();
        formData.append('file', fileBlob, `media-thumbnail-${guidFor(this)}.jpg`);

        const url = `${this.ghostPaths.apiRoot}/images/upload/`;

        const response = yield this.ajax.post(url, {
            data: formData,
            processData: false,
            contentType: false,
            dataType: 'json'
        });

        return response.images[0].url;
    }

    @action
    async customThumbnailUploadStarted() {
        // TODO: get image dimensions
    }

    @action
    async customThumbnailUploadCompleted([image]) {
        this.args.editor.run(() => {
            this.updatePayloadAttr('customThumbnailSrc', image.url);
        });
    }

    @action
    toggleLoop() {
        this.updatePayloadAttr('loop', !this.args.payload.loop);
    }

    @action
    deleteCustomThumbnail(event) {
        event?.stopPropagation();
        this.updatePayloadAttr('customThumbnailSrc', null);
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

    _getFormattedDuration(duration = 200) {
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration - (minutes * 60));
        const paddedSeconds = String(seconds).padStart(2, '0');
        const formattedDuration = `${minutes}:${paddedSeconds}`;
        return formattedDuration;
    }
}
