import $ from 'jquery';
import Component from '@ember/component';
import layout from '../templates/components/koenig-card-image';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {computed, set} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend({
    ui: service(),
    layout,

    // attrs
    files: null,
    payload: null,
    isSelected: false,
    isEditing: false,
    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,

    // closure actions
    selectCard() {},
    deselectCard() {},
    editCard() {},
    saveCard() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},
    addParagraphAfterCard() {},

    kgImgStyle: computed('payload.imageStyle', function () {
        let imageStyle = this.payload.imageStyle;

        if (imageStyle === 'wide') {
            return 'image-wide';
        }

        if (imageStyle === 'full') {
            return 'image-full';
        }

        return 'image-normal';
    }),

    toolbar: computed('payload.{imageStyle,src}', function () {
        let imageStyle = this.payload.imageStyle;
        let items = [];

        items.push({
            title: 'Regular',
            icon: 'koenig/kg-img-regular',
            iconClass: `${!imageStyle ? 'stroke-blue-l2' : 'stroke-white'}`,
            action: run.bind(this, this._changeImageStyle, '')
        });

        items.push({
            title: 'Wide',
            icon: 'koenig/kg-img-wide',
            iconClass: `${imageStyle === 'wide' ? 'stroke-blue-l2' : 'stroke-white'}`,
            action: run.bind(this, this._changeImageStyle, 'wide')
        });

        items.push({
            title: 'Full',
            icon: 'koenig/kg-img-full',
            iconClass: `${imageStyle === 'full' ? 'stroke-blue-l2' : 'stroke-white'}`,
            action: run.bind(this, this._changeImageStyle, 'full')
        });

        if (this.payload.src) {
            items.push({divider: true});

            items.push({
                title: 'Replace image',
                icon: 'koenig/kg-replace',
                iconClass: '',
                action: run.bind(this, this._triggerFileDialog)
            });
        }

        return {items};
    }),

    init() {
        this._super(...arguments);

        if (!this.payload) {
            this.set('payload', {});
        }
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
    },

    willDestroyElement() {
        this._super(...arguments);
        this._detachHandlers();
    },

    actions: {
        updateSrc(images) {
            let [image] = images;
            this._updatePayloadAttr('src', image.url);
        },

        updateCaption(caption) {
            this._updatePayloadAttr('caption', caption);
        },

        onSelect() {
            this._attachHandlers();
        },

        onDeselect() {
            this._detachHandlers();
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
            this._updatePayloadAttr('src', null);
        }
    },

    _changeImageStyle(imageStyle) {
        this._updatePayloadAttr('imageStyle', imageStyle);
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    },

    _attachHandlers() {
        if (!this._keypressHandler) {
            this._keypressHandler = run.bind(this, this._handleKeypress);
            window.addEventListener('keypress', this._keypressHandler);
        }

        if (!this._keydownHandler) {
            this._keydownHandler = run.bind(this, this._handleKeydown);
            window.addEventListener('keydown', this._keydownHandler);
        }
    },

    _detachHandlers() {
        window.removeEventListener('keypress', this._keypressHandler);
        window.removeEventListener('keydown', this._keydownHandler);
        this._keypressHandler = null;
        this._keydownHandler = null;
    },

    // only fires if the card is selected, moves focus to the caption input so
    // that it's possible to start typing without explicitly focusing the input
    _handleKeypress(event) {
        let captionInput = this.element.querySelector('[name="caption"]');

        if (captionInput && captionInput !== document.activeElement) {
            captionInput.value = `${captionInput.value}${event.key}`;
            captionInput.focus();
        }
    },

    // this will be fired for keydown events when the caption input is focused,
    // we look for cursor movements or the enter key to defocus and trigger the
    // corresponding editor behaviour
    _handleKeydown(event) {
        let captionInput = this.element.querySelector('[name="caption"]');

        if (event.target === captionInput) {
            if (event.key === 'Escape') {
                captionInput.blur();
                return;
            }

            if (event.key === 'Enter') {
                captionInput.blur();
                this.addParagraphAfterCard();
                event.preventDefault();
                return;
            }

            let selectionStart = captionInput.selectionStart;
            let length = captionInput.value.length;

            if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && selectionStart === 0) {
                captionInput.blur();
                this.moveCursorToPrevSection();
                event.preventDefault();
                return;
            }

            if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && selectionStart === length) {
                captionInput.blur();
                this.moveCursorToNextSection();
                event.preventDefault();
                return;
            }
        }
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
