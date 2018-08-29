import $ from 'jquery';
import Component from '@ember/component';
import EmberObject, {computed, set} from '@ember/object';
import countWords, {stripTags} from '../utils/count-words';
import layout from '../templates/components/koenig-card-gallery';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {htmlSafe} from '@ember/string';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';

const MAX_IMAGES = 9;
const MAX_PER_ROW = 3;

export default Component.extend({
    layout,
    // attrs
    files: null,
    images: null,
    payload: null,
    isSelected: false,
    isEditing: false,
    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,

    // properties
    errorMessage: null,
    handlesDragDrop: true,

    // closure actions
    selectCard() { },
    deselectCard() { },
    editCard() { },
    saveCard() { },
    deleteCard() { },
    moveCursorToNextSection() { },
    moveCursorToPrevSection() { },
    addParagraphAfterCard() { },
    registerComponent() { },

    counts: computed('payload.{caption,payload.images.[]}', function () {
        let wordCount = 0;
        let imageCount = this.payload.images.length;

        if (this.payload.src) {
            imageCount += 1;
        }

        if (this.payload.caption) {
            wordCount += countWords(stripTags(this.payload.caption));
        }

        return {wordCount, imageCount};
    }),

    toolbar: computed('images.[]', function () {
        let items = [];

        if (!isEmpty(this.images)) {
            items.push({
                title: 'Add images',
                icon: 'koenig/kg-add',
                iconClass: 'fill-white',
                action: run.bind(this, this._triggerFileDialog)
            });
        }

        if (items.length > 0) {
            return {items};
        }
    }),

    imageRows: computed('images.@each.{src,previewSrc,width,height,row}', function () {
        let rows = [];
        let noOfImages = this.images.length;

        this.images.forEach((image, idx) => {
            let row = image.row;
            let classes = ['relative', 'hide-child'];

            if (noOfImages > 1 && (noOfImages % 3 === 1) && (idx === (noOfImages - 2))) {
                row = row + 1;
            }
            if (!rows[row]) {
                rows[row] = [];
            } else {
                classes.push('ml4');
            }

            if (row > 0) {
                classes.push('mt4');
            }

            let styledImage = Object.assign({}, image);
            let aspectRatio = (image.width || 1) / (image.height || 1);
            styledImage.style = htmlSafe(`flex: ${aspectRatio} 1 0%`);
            styledImage.classes = classes.join(' ');

            rows[row].push(styledImage);
        });

        return rows;
    }),

    init() {
        this._super(...arguments);

        if (!this.payload || isEmpty(this.payload.images)) {
            this._updatePayloadAttr('images', []);
        }

        this.images = this.payload.images.map(image => EmberObject.create(image));

        this.registerComponent(this);
    },

    actions: {
        insertImageIntoPayload(uploadResult) {
            let image = this.images.findBy('fileName', uploadResult.fileName);
            let idx = this.images.indexOf(image);

            image.set('src', uploadResult.url);

            this.payload.images.replace(idx, 1, [
                Object.assign({}, image, {previewSrc: undefined})
            ]);

            this._updatePayloadAttr('images', this.payload.images);
        },

        setFiles(files) {
            this._startUpload(files);
        },

        insertImagePreviews(files) {
            let count = this.images.length;
            let row = Math.ceil(count / MAX_PER_ROW) - 1;

            Array.from(files).forEach((file) => {
                count = count + 1;
                row = Math.ceil(count / MAX_PER_ROW) - 1;

                let image = EmberObject.create({
                    row,
                    fileName: file.name
                });

                this.images.pushObject(image);
                this.payload.images.push(Object.assign({}, image));

                let reader = new FileReader();

                reader.onload = (e) => {
                    let imageObject = new Image();
                    let previewSrc = htmlSafe(e.target.result);

                    if (!image.src) {
                        image.set('previewSrc', previewSrc);
                    }

                    imageObject.onload = () => {
                        // update current display images
                        image.set('width', imageObject.width);
                        image.set('height', imageObject.height);

                        // ensure width/height makes it into the payload images
                        let payloadImage = this.payload.images.findBy('fileName', image.fileName);
                        if (payloadImage) {
                            payloadImage.width = imageObject.width;
                            payloadImage.height = imageObject.height;
                            this._updatePayloadAttr('images', this.payload.images);
                        }
                    };

                    imageObject.src = previewSrc;
                };

                reader.readAsDataURL(file);
            });
        },

        deleteImage(image) {
            let localImage = this.images.findBy('fileName', image.fileName);
            this.images.removeObject(localImage);
            this.images.forEach((img, idx) => {
                img.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1;
            });

            let payloadImage = this.payload.images.findBy('fileName', image.fileName);
            this.payload.images.removeObject(payloadImage);
            this.payload.images.forEach((img, idx) => {
                img.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1;
            });

            this._updatePayloadAttr('images', this.payload.images);
        },

        updateCaption(caption) {
            this._updatePayloadAttr('caption', caption);
        },

        /**
         * Opens a file selection dialog - Triggered by "Upload Image" buttons,
         * searches for the hidden file input within the .gh-setting element
         * containing the clicked button then simulates a click
         * @param  {MouseEvent} event - MouseEvent fired by the button click
         */
        triggerFileDialog(event) {
            this._triggerFileDialog(event);
        },

        uploadFailed(uploadResult) {
            let image = this.images.findBy('fileName', uploadResult.fileName);
            this.images.removeObject(image);

            let payloadImage = this.payload.images.findBy('fileName', uploadResult.fileName);
            this.payload.images.removeObject(payloadImage);
            this._updatePayloadAttr('images', this.payload.images);

            this.set('errorMessage', 'Some images failed to upload');
        },

        clearErrorMessage() {
            this.set('errorMessage', null);
        }
    },

    _startUpload(files = []) {
        let currentCount = this.images.length;
        let allowedCount = (MAX_IMAGES - currentCount);

        let strippedFiles = Array.prototype.slice.call(files, 0, allowedCount);
        if (strippedFiles.length < files.length) {
            this.set('errorMessage', 'Can contain only upto 9 images!');
        }
        this.set('files', strippedFiles);
    },

    dragOver(event) {
        if (!event.dataTransfer) {
            return;
        }

        // this is needed to work around inconsistencies with dropping files
        // from Chrome's downloads bar
        if (navigator.userAgent.indexOf('Chrome') > -1) {
            let eA = event.dataTransfer.effectAllowed;
            event.dataTransfer.dropEffect = (eA === 'move' || eA === 'linkMove') ? 'move' : 'copy';
        }

        event.stopPropagation();
        event.preventDefault();

        this.set('isDraggedOver', true);
    },

    dragLeave(event) {
        event.preventDefault();
        this.set('isDraggedOver', false);
    },

    drop(event) {
        event.preventDefault();
        this.set('isDraggedOver', false);

        if (event.dataTransfer.files) {
            this._startUpload(event.dataTransfer.files);
        }
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    },

    _triggerFileDialog(event) {
        let target = event && event.target || this.element;

        // simulate click to open file dialog
        // using jQuery because IE11 doesn't support MouseEvent
        $(target)
            .closest('.__mobiledoc-card')
            .find('input[type="file"]')
            .click();
    }
});
