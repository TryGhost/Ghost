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
import {inject as service} from '@ember/service';

const MAX_IMAGES = 9;
const MAX_PER_ROW = 3;

export default Component.extend({
    koenigDragDropHandler: service(),

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

    _dragDropContainer: null,

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
        // 3 images per row unless last row would have a single image in which
        // case the last 2 rows will have 2 images
        let maxImagesInRow = function (idx) {
            return noOfImages > 1 && (noOfImages % 3 === 1) && (idx === (noOfImages - 2));
        };

        this.images.forEach((image, idx) => {
            let row = image.row;
            let classes = [];
            let overlayClasses = [];

            // start a new display row if necessary
            if (maxImagesInRow(idx)) {
                row = row + 1;
            }

            // apply classes to the image containers
            if (!rows[row]) {
                // first image in row
                rows[row] = [];
                classes.push('pr2');
                overlayClasses.push('ml2');
            } else if (((idx + 1) % 3 === 0) || maxImagesInRow(idx + 1) || idx + 1 === noOfImages) {
                // last image in row
                classes.push('pl2');
                overlayClasses.push('ml2');
            } else {
                // middle of row
                classes.push('pl2', 'pr2');
                overlayClasses.push('ml2', 'mr2');
            }

            if (row > 0) {
                classes.push('mt4');
            }

            let styledImage = Object.assign({}, image);
            let aspectRatio = (image.width || 1) / (image.height || 1);
            styledImage.style = htmlSafe(`flex: ${aspectRatio} 1 0%`);
            styledImage.classes = htmlSafe(classes.join(' '));
            styledImage.overlayClasses = htmlSafe(overlayClasses.join(' '));

            rows[row].push(styledImage);
        });

        return rows;
    }),

    init() {
        this._super(...arguments);

        if (!this.payload || isEmpty(this.payload.images)) {
            this._updatePayloadAttr('images', []);
        }

        this._buildImages();

        this.registerComponent(this);
    },

    willDestroyElement() {
        this._super(...arguments);

        if (this._dragDropContainer) {
            this._dragDropContainer.destroy();
        }
    },

    actions: {
        addImage(file) {
            let count = this.images.length + 1;
            let row = Math.ceil(count / MAX_PER_ROW) - 1;

            let image = this._readDataFromImageFile(file);
            image.row = row;
            this.images.pushObject(image);
        },

        setImageSrc(uploadResult) {
            let image = this.images.findBy('fileName', uploadResult.fileName);

            image.set('src', uploadResult.url);

            this._buildAndSaveImagesPayload();
        },

        setFiles(files) {
            this._startUpload(files);
        },

        deleteImage(image) {
            let localImage = this.images.findBy('fileName', image.fileName);
            this.images.removeObject(localImage);
            this._recalculateImageRows();
            this._buildAndSaveImagesPayload();
        },

        updateCaption(caption) {
            this._updatePayloadAttr('caption', caption);
        },

        triggerFileDialog(event) {
            this._triggerFileDialog(event);
        },

        uploadFailed(uploadResult) {
            let image = this.images.findBy('fileName', uploadResult.fileName);
            this.images.removeObject(image);

            this._buildAndSaveImagesPayload();
            let fileName = (uploadResult.fileName.length > 20) ? `${uploadResult.fileName.substr(0, 20)}...` : uploadResult.fileName;
            this.set('errorMessage', `${fileName} failed to upload`);
        },
        handleErrors(errors) {
            let errorMssg = ((errors[0] && errors[0].message)) || 'Some images failed to upload';
            this.set('errorMessage', errorMssg);
        },

        clearErrorMessage() {
            this.set('errorMessage', null);
        },

        didSelect() {
            if (this._dragDropContainer) {
                // add a delay when enabling reorder drag/drop so that the card
                // must be selected before a reorder drag can be initiated
                // - allows for cards to be drag and dropped themselves
                run.later(this, function () {
                    if (!this.isDestroyed && !this.isDestroying) {
                        this._dragDropContainer.enableDrag();
                    }
                }, 100);
            }
        },

        didDeselect() {
            if (this._dragDropContainer) {
                this._dragDropContainer.disableDrag();
            }
        }
    },

    // Ember event handlers ----------------------------------------------------

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

    // Private methods ---------------------------------------------------------

    _recalculateImageRows() {
        this.images.forEach((image, idx) => {
            image.set('row', Math.ceil((idx + 1) / MAX_PER_ROW) - 1);
        });
    },

    _startUpload(files = []) {
        let currentCount = this.images.length;
        let allowedCount = (MAX_IMAGES - currentCount);

        let strippedFiles = Array.prototype.slice.call(files, 0, allowedCount);
        if (strippedFiles.length < files.length) {
            this.set('errorMessage', 'Galleries are limited to 9 images');
        }
        this.set('files', strippedFiles);
    },

    _readDataFromImageFile(file) {
        let url = URL.createObjectURL(file);
        let image = EmberObject.create({
            fileName: file.name,
            previewSrc: url
        });

        let imageElem = new Image();
        imageElem.onload = () => {
            // update current display images
            image.set('width', imageElem.naturalWidth);
            image.set('height', imageElem.naturalHeight);

            // ensure width/height makes it into the payload images
            this._buildAndSaveImagesPayload();
        };
        imageElem.src = url;

        return image;
    },

    _buildAndSaveImagesPayload() {
        let payloadImages = [];

        let isValidImage = image => image.fileName
                && image.src
                && image.width
                && image.height;

        this.images.forEach((image, idx) => {
            if (isValidImage(image)) {
                let payloadImage = Object.assign({}, image, {previewSrc: undefined});
                payloadImage.row = Math.ceil((idx + 1) / MAX_PER_ROW) - 1;

                payloadImages.push(payloadImage);
            }
        });

        this._updatePayloadAttr('images', payloadImages);
    },

    _buildImages() {
        this.images = this.payload.images.map(image => EmberObject.create(image));
        this._registerOrRefreshDragDropHandler();
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);

        this._registerOrRefreshDragDropHandler();
    },

    _triggerFileDialog(event) {
        let target = event && event.target || this.element;

        // simulate click to open file dialog
        // using jQuery because IE11 doesn't support MouseEvent
        $(target)
            .closest('.__mobiledoc-card')
            .find('input[type="file"]')
            .click();
    },

    // TODO: revisit when the container is created and when drag is enabled/disabled
    // - rename container so that it's more explicit when we have an initial file
    //   drop container vs a drag reorder+file drop container?
    _registerOrRefreshDragDropHandler() {
        if (this._dragDropContainer) {
            run.schedule('afterRender', this, function () {
                this._dragDropContainer.refresh();
                if (!isEmpty(this.images) && !this._dragDropContainer.isDragEnabled) {
                    this._dragDropContainer.enableDrag();
                }
            });
        } else {
            run.schedule('afterRender', this, function () {
                let galleryElem = this.element.querySelector('[data-gallery]');
                if (galleryElem) {
                    this._dragDropContainer = this.koenigDragDropHandler.registerContainer(
                        galleryElem,
                        {
                            draggableSelector: '[data-image]',
                            droppableSelector: '[data-image]',
                            isDragEnabled: !isEmpty(this.images),
                            onDragStart: run.bind(this, function () {
                                // TODO: can this be handled in koenig-card?
                                // not currently done so because kg-card-hover is added as a base class
                                // by (kg-style "media-card")
                                this.element.querySelector('figure').classList.remove('kg-card-hover');
                                this.element.querySelector('figure').classList.remove('kg-card-selected');
                            }),
                            onDragEnd: run.bind(this, function () {
                                this.element.querySelector('figure').classList.add('kg-card-hover');
                                if (this.isSelected) {
                                    this.element.querySelector('figure').classList.add('kg-card-selected');
                                }
                            }),
                            getDraggableInfo: run.bind(this, this._getDraggableInfo),
                            getIndicatorPosition: run.bind(this, this._getDropIndicatorPosition),
                            onDrop: run.bind(this, this._onDrop)
                        }
                    );
                }
            });
        }
    },

    _getDraggableInfo(draggableElement) {
        let src = draggableElement.querySelector('img').getAttribute('src');
        let image = this.images.findBy('src', src) || this.images.findBy('previewSrc', src);
        let payload = image && image.getProperties('fileName', 'src', 'row', 'width', 'height');

        if (image) {
            return {
                type: 'image',
                payload
            };
        }

        return {};
    },

    _onDrop(draggableInfo/*, droppableElem, position*/) {
        // do not allow dragging between galleries for now
        if (!this.element.contains(draggableInfo.element)) {
            return false;
        }

        let droppables = Array.from(this.element.querySelectorAll('[data-image]'));
        let draggableIndex = droppables.indexOf(draggableInfo.element);

        if (this._isDropAllowed(draggableIndex, draggableInfo.insertIndex)) {
            let draggedImage = this.images.findBy('src', draggableInfo.payload.src);

            this.images.removeObject(draggedImage);
            this.images.insertAt(draggableInfo.insertIndex, draggedImage);
            this._recalculateImageRows();

            this._buildAndSaveImagesPayload();
            this._dragDropContainer.refresh();
        }
    },

    // returns {
    //   direction: 'horizontal' TODO: use a constant?
    //   position: 'left'/'right' TODO: use constants?
    //   beforeElems: array of elems to left of indicator
    //   afterElems: array of elems to right of indicator
    //   droppableIndex:
    // }
    _getDropIndicatorPosition(draggableInfo, droppableElem, position) {
        // do not allow dragging between galleries for now
        if (!this.element.contains(draggableInfo.element)) {
            return false;
        }

        let row = droppableElem.closest('[data-row]');
        let droppables = Array.from(this.element.querySelectorAll('[data-image]'));
        let draggableIndex = droppables.indexOf(draggableInfo.element);
        let droppableIndex = droppables.indexOf(droppableElem);

        if (row && this._isDropAllowed(draggableIndex, droppableIndex, position)) {
            let rowImages = Array.from(row.querySelectorAll('[data-image]'));
            let rowDroppableIndex = rowImages.indexOf(droppableElem);
            let insertIndex = droppableIndex;
            let beforeElems = [];
            let afterElems = [];

            rowImages.forEach((image, index) => {
                if (index < rowDroppableIndex) {
                    beforeElems.push(image);
                }

                if (index === rowDroppableIndex) {
                    if (position.match(/left/)) {
                        afterElems.push(image);
                    } else {
                        beforeElems.push(image);
                    }
                }

                if (index > rowDroppableIndex) {
                    afterElems.push(image);
                }
            });

            if (position.match(/right/) && draggableIndex > insertIndex) {
                insertIndex += 1;
            }

            if (insertIndex >= this.images.length - 1) {
                insertIndex = this.images.length - 1;
            }

            return {
                direction: 'horizontal',
                position: position.match(/left/) ? 'left' : 'right',
                beforeElems,
                afterElems,
                insertIndex
            };
        } else {
            return false;
        }
    },

    // we don't allow an image to be dropped where it would end up in the
    // same position within the gallery
    _isDropAllowed(draggableIndex, droppableIndex, position = '') {
        // can't drop on itself
        if (draggableIndex === droppableIndex) {
            return false;
        }

        // account for dropping at beginning or end of a row
        if (position.match(/left/)) {
            droppableIndex -= 1;
        }

        if (position.match(/right/)) {
            droppableIndex += 1;
        }

        return droppableIndex !== draggableIndex;
    }
});
