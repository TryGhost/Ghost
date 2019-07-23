import $ from 'jquery';
import Component from '@ember/component';
import layout from '../templates/components/koenig-card-image';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action, computed, set, setProperties} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {htmlSafe} from '@ember/string';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const {countWords} = ghostHelperUtils;

export default Component.extend({
    ui: service(),
    layout,

    // attrs
    editor: null,
    files: null,
    payload: null,
    isSelected: false,
    isEditing: false,
    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,

    // properties
    handlesDragDrop: true,
    isEditingAlt: false,

    // closure actions
    selectCard() {},
    deselectCard() {},
    editCard() {},
    saveCard() {},
    deleteCard() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},
    addParagraphAfterCard() {},
    registerComponent() {},

    imageSelector: computed('payload.imageSelector', function () {
        let selector = this.payload.imageSelector;
        let imageSelectors = {
            unsplash: 'gh-unsplash'
        };

        return imageSelectors[selector];
    }),

    counts: computed('payload.{src,caption}', function () {
        let wordCount = 0;
        let imageCount = 0;

        if (this.payload.src) {
            imageCount += 1;
        }

        if (this.payload.caption) {
            wordCount += countWords(this.payload.caption);
        }

        return {wordCount, imageCount};
    }),

    kgImgStyle: computed('payload.cardWidth', function () {
        let cardWidth = this.payload.cardWidth;

        if (cardWidth === 'wide') {
            return 'image-wide';
        }

        if (cardWidth === 'full') {
            return 'image-full';
        }

        return 'image-normal';
    }),

    toolbar: computed('payload.{cardWidth,src}', function () {
        if (!this.payload.src) {
            return false;
        }

        let cardWidth = this.payload.cardWidth;

        return {
            items: [{
                title: 'Regular',
                icon: 'koenig/kg-img-regular',
                iconClass: `${!cardWidth ? 'fill-blue-l2' : 'fill-white'}`,
                action: run.bind(this, this._changeCardWidth, '')
            }, {
                title: 'Wide',
                icon: 'koenig/kg-img-wide',
                iconClass: `${cardWidth === 'wide' ? 'fill-blue-l2' : 'fill-white'}`,
                action: run.bind(this, this._changeCardWidth, 'wide')
            }, {
                title: 'Full',
                icon: 'koenig/kg-img-full',
                iconClass: `${cardWidth === 'full' ? 'fill-blue-l2' : 'fill-white'}`,
                action: run.bind(this, this._changeCardWidth, 'full')
            }, {
                divider: true
            }, {
                title: 'Replace image',
                icon: 'koenig/kg-replace',
                iconClass: 'fill-white',
                action: run.bind(this, this._triggerFileDialog)
            }]
        };
    }),

    init() {
        this._super(...arguments);

        if (!this.payload) {
            this.set('payload', {});
        }

        let placeholders = ['summer', 'mountains', 'ufo-attack'];
        this.set('placeholder', placeholders[Math.floor(Math.random() * placeholders.length)]);

        this.registerComponent(this);
    },

    didReceiveAttrs() {
        this._super(...arguments);

        // `payload.files` can be set if we have an externaly set image that
        // should be uploaded. Typical example would be from a paste or drag/drop
        if (!isEmpty(this.payload.files)) {
            run.schedule('afterRender', this, function () {
                this.set('files', this.payload.files);

                // we don't want to  persist any file data in the document
                delete this.payload.files;
            });
        }

        // switch back to displaying caption when card is not selected
        if (!this.isSelected) {
            this.set('isEditingAlt', false);
        }
    },

    actions: {
        updateSrc(images) {
            let [image] = images;

            // create undo snapshot when image finishes uploading
            this.editor.run(() => {
                this._updatePayloadAttr('src', image.url);
            });
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

        setPreviewSrc(files) {
            let file = files[0];
            if (file) {
                let reader = new FileReader();

                reader.onload = (e) => {
                    this.set('previewSrc', htmlSafe(e.target.result));
                };

                reader.readAsDataURL(file);
            }
        },

        resetSrcs() {
            this.set('previewSrc', null);

            // create undo snapshot when clearing
            this.editor.run(() => {
                this._updatePayloadAttr('src', null);
            });
        },

        selectFromImageSelector({src, caption, alt}) {
            let {payload, saveCard} = this;
            let searchTerm;

            setProperties(payload, {src, caption, alt, searchTerm});

            this.send('closeImageSelector');

            // create undo snapshot when selecting an image
            this.editor.run(() => {
                saveCard(payload, false);
            });
        },

        closeImageSelector() {
            if (!this.payload.src) {
                return this.deleteCard();
            }

            set(this.payload, 'imageSelector', undefined);

            // ensure focus is returned to the editor so that the card which
            // appears selected behaves as if it's selected
            this.editor.focus();
        }
    },

    updateCaption: action(function (caption) {
        this._updatePayloadAttr('caption', caption);
    }),

    toggleAltEditing: action(function () {
        this.toggleProperty('isEditingAlt');
    }),

    updateAlt: action(function (alt) {
        this._updatePayloadAttr('alt', alt);
    }),

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
            this.set('files', [event.dataTransfer.files[0]]);
        }
    },

    _changeCardWidth(cardWidth) {
        // create undo snapshot when changing image size
        this.editor.run(() => {
            this._updatePayloadAttr('cardWidth', cardWidth);
        });
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
