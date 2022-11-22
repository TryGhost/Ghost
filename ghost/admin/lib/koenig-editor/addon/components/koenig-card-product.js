import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';

export default class KoenigCardProductComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

    @tracked files = null;
    @tracked previewSrc = null;
    @tracked isDraggedOver = false;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    handlesDragDrop = true;

    get isButtonIncomplete() {
        const {productUrl, productButton} = this.args.payload;
        return !productUrl || !productButton;
    }

    get isEmpty() {
        const {productTitle, productDescription, productUrl, productButton, productImageSrc, productRatingEnabled, productButtonEnabled} = this.args.payload;

        return isBlank(productTitle) && isBlank(productDescription) && (!productButtonEnabled || (isBlank(productUrl) || isBlank(productButton))) && isBlank(productImageSrc) && !productRatingEnabled;
    }

    get isIncomplete() {
        const {productTitle, productDescription} = this.args.payload;

        return isBlank(productTitle) || isBlank(productDescription);
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
                action: run.bind(this, this.args.editCard)
            }]
        };
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {
            productButtonEnabled: false,
            productRatingEnabled: false,
            productStarRating: 5
        };

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this._updatePayloadAttr(key, value);
            }
        });

        let placeholders = ['summer', 'mountains', 'ufo-attack'];
        this.placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
    }

    @action
    registerTitleEditor(textReplacementEditor) {
        let commands = {
            ENTER: this.handleTitleTab.bind(this),
            TAB: this.handleTitleTab.bind(this),
            'META+ENTER': run.bind(this, this._enter, 'meta'),
            'CTRL+ENTER': run.bind(this, this._enter, 'ctrl')
        };

        Object.keys(commands).forEach((str) => {
            textReplacementEditor.registerKeyCommand({
                str,
                run() {
                    return commands[str](textReplacementEditor, str);
                }
            });
        });

        this._textReplacementEditor = textReplacementEditor;

        run.scheduleOnce('afterRender', this, this._afterRender);
    }

    handleTitleTab() {
        let contentInput = this.element.querySelector('.kg-product-card-description .koenig-basic-html-textarea__editor');

        if (contentInput) {
            contentInput.focus();
        }
    }

    @action
    registerEditor(textReplacementEditor) {
        let commands = {
            'META+ENTER': run.bind(this, this._enter, 'meta'),
            'CTRL+ENTER': run.bind(this, this._enter, 'ctrl')
        };

        Object.keys(commands).forEach((str) => {
            textReplacementEditor.registerKeyCommand({
                str,
                run() {
                    return commands[str](textReplacementEditor, str);
                }
            });
        });

        this._textReplacementEditor = textReplacementEditor;

        run.scheduleOnce('afterRender', this, this._afterRender);
    }

    _enter(modifier) {
        if (this.args.isEditing && (modifier === 'meta' || (modifier === 'ctrl' && Browser.isWin()))) {
            this.args.editCard();
        }
    }

    @action
    setProductTitle(content) {
        this._updatePayloadAttr('productTitle', content);
    }

    @action
    setProductDescription(content) {
        this._updatePayloadAttr('productDescription', content);
    }

    @action
    setProductUrl(event) {
        this._updatePayloadAttr('productUrl', event.target.value);
        if (!this.args.payload.productButtonEnabled) {
            this._updatePayloadAttr('productButtonEnabled', true);
        }
    }

    @action
    setProductButton(event) {
        this._updatePayloadAttr('productButton', event.target.value);
        if (!this.args.payload.productButtonEnabled) {
            this._updatePayloadAttr('productButtonEnabled', true);
        }
    }

    @action
    leaveEditMode() {
        if (this.isEmpty) {
            // afterRender is required to avoid double modification of `isSelected`
            // TODO: see if there's a way to avoid afterRender
            run.scheduleOnce('afterRender', this, this.args.deleteCard);
        }
    }

    @action
    focusElement(selector, event) {
        event.preventDefault();
        document.querySelector(selector)?.focus();
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }

    _afterRender() {
        this._placeCursorAtEnd();
        this._focusInput();
    }

    _placeCursorAtEnd() {
        if (!this._textReplacementEditor) {
            return;
        }

        let tailPosition = this._textReplacementEditor.post.tailPosition();
        let rangeToSelect = tailPosition.toRange();
        this._textReplacementEditor.selectRange(rangeToSelect);
    }

    _focusInput() {
        let headingInput = this.element.querySelector('.kg-product-card-title .koenig-basic-html-input__editor');

        if (headingInput) {
            headingInput.focus();
        }
    }

    @action
    setPreviewSrc(files) {
        let file = files[0];
        if (file) {
            let url = URL.createObjectURL(file);
            this.previewSrc = url;

            let imageElem = new Image();
            imageElem.onload = () => {
                // store width/height for use later to avoid saving an image card with no `src`
                this._productImageWidth = imageElem.naturalWidth;
                this._productImageHeight = imageElem.naturalHeight;
            };
            imageElem.src = url;
        }
    }

    @action
    resetSrcs() {
        // this.set('previewSrc', null);
        this.previewSrc = null;
        this._productImageWidth = null;
        this._productImageHeight = null;

        // create undo snapshot when clearing
        this.args.editor.run(() => {
            this._updatePayloadAttr('productImageSrc', null);
            this._updatePayloadAttr('productImageWidth', null);
            this._updatePayloadAttr('productImageHeight', null);
        });
    }

    @action
    updateSrc(images) {
        let [image] = images;

        // create undo snapshot when image finishes uploading
        this.args.editor.run(() => {
            this._updatePayloadAttr('productImageSrc', image.url);
            if (this._productImageWidth && this._productImageHeight) {
                this._updatePayloadAttr('productImageWidth', this._productImageWidth);
                this._updatePayloadAttr('productImageHeight', this._productImageHeight);
            }
            this._productImageWidth = null;
            this._productImageHeight = null;
        });

        this.files = null;
    }

    /**
     * Opens a file selection dialog - Triggered by "Upload Image" buttons,
     * searches for the hidden file input within the .gh-setting element
     * containing the clicked button then simulates a click
     * @param  {MouseEvent} event - MouseEvent fired by the button click
     */
    @action
    triggerFileDialog(event) {
        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        fileInput?.click();
    }

    @action
    changeStars(event) {
        this._updatePayloadAttr('productStarRating', event.currentTarget.value);
    }

    @action
    toggleProductButton() {
        this._updatePayloadAttr('productButtonEnabled', !this.args.payload.productButtonEnabled);
    }

    @action
    toggleProductRating() {
        this._updatePayloadAttr('productRatingEnabled', !this.args.payload.productRatingEnabled);
    }

    @action
    hoverStarOn(event) {
        const val = event.currentTarget.value;
        const stars = this.element.querySelectorAll('.kg-product-card-rating-star');
        for (let i = 0; i + 1 <= val && i < stars.length; i++) {
            stars[i].classList.add('kg-product-card-rating-star-hovered');
        }
    }

    @action
    hoverStarOff() {
        const stars = this.element.querySelectorAll('.kg-product-card-rating-star');
        for (let i = 0; i < stars.length; i++) {
            stars[i].classList.remove('kg-product-card-rating-star-hovered');
        }
    }

    @action
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
        this.isDraggedOver = false;

        if (event.dataTransfer.files) {
            this.files = [event.dataTransfer.files[0]];
        }
    }
}
