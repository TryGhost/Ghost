import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action, computed, set, setProperties} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {isEmpty} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const {countWords} = ghostHelperUtils;

@classic
export default class KoenigCardImage extends Component {
    @service ui;

    // attrs
    editor = null;
    files = null;
    payload = null;
    isSelected = false;
    isEditing = false;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    // properties
    handlesDragDrop = true;
    isEditingAlt = false;

    // closure actions
    selectCard() {}
    deselectCard() {}
    editCard() {}
    saveCard() {}
    deleteCard() {}
    moveCursorToNextSection() {}
    moveCursorToPrevSection() {}
    addParagraphAfterCard() {}
    registerComponent() {}

    @computed('payload.src')
    get isEmpty() {
        return !this.payload.src;
    }

    @computed('payload.imageSelector')
    get imageSelector() {
        let selector = this.payload.imageSelector;
        let imageSelectors = {
            unsplash: {
                component: 'gh-unsplash',
                type: 'modal'
            },
            tenor: {
                component: 'koenig-card-image/selector-tenor',
                type: 'placeholder'
            }
        };

        return imageSelectors[selector];
    }

    @computed('payload.{src,caption}')
    get counts() {
        let wordCount = 0;
        let imageCount = 0;

        if (this.payload.src) {
            imageCount += 1;
        }

        if (this.payload.caption) {
            wordCount += countWords(this.payload.caption);
        }

        return {wordCount, imageCount};
    }

    @computed('payload.cardWidth')
    get kgImgStyle() {
        let cardWidth = this.payload.cardWidth;

        if (cardWidth === 'wide') {
            return 'image-wide';
        }

        if (cardWidth === 'full') {
            return 'image-full';
        }

        return 'image-normal';
    }

    @computed('isEditingLink', 'payload.{cardWidth,src}')
    get toolbar() {
        if (!this.payload.src || this.isEditingLink) {
            return false;
        }

        let cardWidth = this.payload.cardWidth;
        let toolbarItems;

        if (this.payload.type === 'gif') {
            toolbarItems = [{
                title: 'Link',
                icon: 'koenig/kg-link',
                iconClass: this.payload.href ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this._editLink)
            }];
        } else {
            toolbarItems = [{
                title: 'Regular',
                icon: 'koenig/kg-img-regular',
                iconClass: !cardWidth ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this._changeCardWidth, '')
            }, {
                title: 'Wide',
                icon: 'koenig/kg-img-wide',
                iconClass: cardWidth === 'wide' ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this._changeCardWidth, 'wide')
            }, {
                title: 'Full',
                icon: 'koenig/kg-img-full',
                iconClass: cardWidth === 'full' ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this._changeCardWidth, 'full')
            }, {
                divider: true
            }, {
                title: 'Link',
                icon: 'koenig/kg-link',
                iconClass: this.payload.href ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this._editLink)
            }, {
                title: 'Replace image',
                icon: 'koenig/kg-replace',
                iconClass: 'fill-white',
                action: this.triggerFileDialog
            }];
        }

        return {items: toolbarItems};
    }

    init() {
        super.init(...arguments);

        if (!this.payload) {
            this.set('payload', {});
        }

        let placeholders = ['summer', 'mountains', 'ufo-attack'];
        this.set('placeholder', placeholders[Math.floor(Math.random() * placeholders.length)]);

        this.registerComponent(this);
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

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
    }

    didInsertElement() {
        super.didInsertElement(...arguments);

        if (this.payload.triggerBrowse && !this.payload.src && !this.payload.files) {
            // we don't want to persist this in the serialized payload
            this._updatePayloadAttr('triggerBrowse', undefined);

            let fileInput = this.element.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.click();
            }
        }

        if (this.imageSelector) {
            this.scrollToCard();
        }
    }

    @action
    updateSrc(images) {
        let [image] = images;

        // create undo snapshot when image finishes uploading
        this.editor.run(() => {
            this._updatePayloadAttr('src', image.url);
            if (this._imageWidth && this._imageHeight) {
                this._updatePayloadAttr('width', this._imageWidth);
                this._updatePayloadAttr('height', this._imageHeight);
            }
            this._imageWidth = null;
            this._imageHeight = null;
        });
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
    setPreviewSrc(files) {
        let file = files[0];
        if (file) {
            let url = URL.createObjectURL(file);
            this.set('previewSrc', url);

            let imageElem = new Image();
            imageElem.onload = () => {
                // store width/height for use later to avoid saving an image card with no `src`
                this._imageWidth = imageElem.naturalWidth;
                this._imageHeight = imageElem.naturalHeight;
            };
            imageElem.src = url;
        }
    }

    @action
    resetSrcs() {
        this.set('previewSrc', null);
        this._imageWidth = null;
        this._imageHeight = null;

        // create undo snapshot when clearing
        this.editor.run(() => {
            this._updatePayloadAttr('src', null);
            this._updatePayloadAttr('width', null);
            this._updatePayloadAttr('height', null);
        });
    }

    @action
    selectFromImageSelector({src, width, height, caption, alt, type}) {
        let {payload, saveCard} = this;
        let searchTerm;

        setProperties(payload, {src, width, height, caption, alt, type, searchTerm});

        this.send('closeImageSelector');

        // create undo snapshot when selecting an image
        this.editor.run(() => {
            saveCard(payload, false);
        });
        this.deselectCard();
        this.selectCard();
        this.scrollToCard();
    }

    @action
    closeImageSelector(reselectParagraph = true) {
        if (!this.payload.src) {
            if (!this.env.postModel.parent) {
                // card has been deleted by cleanup
                return;
            }

            return this.editor.run((postEditor) => {
                let {builder} = postEditor;
                let cardSection = this.env.postModel;
                let p = builder.createMarkupSection('p');

                postEditor.replaceSection(cardSection, p);

                if (reselectParagraph) {
                    postEditor.setRange(p.tailPosition());
                }
            });
        }

        set(this.payload, 'imageSelector', undefined);
    }

    @action
    updateHref(href) {
        this._updatePayloadAttr('href', href);
    }

    @action
    cancelEditLink() {
        this.set('isEditing', false);
        this.set('isEditingLink', false);
    }

    @action
    onDeselect() {
        if (this.imageSelector?.type === 'placeholder' && !this.payload.src) {
            this.send('closeImageSelector', false);
        }
    }

    @action
    updateCaption(caption) {
        this._updatePayloadAttr('caption', caption);
    }

    @action
    toggleAltEditing() {
        this.toggleProperty('isEditingAlt');
    }

    @action
    updateAlt(alt) {
        this._updatePayloadAttr('alt', alt);
    }

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
    }

    dragLeave(event) {
        event.preventDefault();
        this.set('isDraggedOver', false);
    }

    drop(event) {
        event.preventDefault();
        this.set('isDraggedOver', false);

        if (event.dataTransfer.files) {
            this.set('files', [event.dataTransfer.files[0]]);
        }
    }

    _changeCardWidth(cardWidth) {
        // create undo snapshot when changing image size
        this.editor.run(() => {
            this._updatePayloadAttr('cardWidth', cardWidth);
        });
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    }

    _editLink(event) {
        event.preventDefault();
        event.stopPropagation();
        const rect = this.element.getBoundingClientRect();
        rect.x = rect.x - 5;
        this.set('linkRect', rect);
        this.set('isEditing', true); // hide snippet icon in toolbar
        this.set('isEditingLink', true);
    }
}
