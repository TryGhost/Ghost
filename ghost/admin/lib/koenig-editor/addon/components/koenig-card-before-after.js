import Component from '@glimmer/component';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

export default class KoenigCardBeforeAfterComponent extends Component {
    @tracked imageWidth;
    files = null;
    selectingFile = false;
    imageMimeTypes = IMAGE_MIME_TYPES;
    imageExtensions = IMAGE_EXTENSIONS;

    get isPopulated() {
        return this.args.payload.beforeImage && this.args.payload.afterImage;
    }

    get overlayStyle() {
        return `width: ${this.args.payload.startingPosition}%`;
    }

    get toolbar() {
        let cardWidth = this.args.payload.cardWidth;

        return {
            items: [{
                title: 'Wide',
                icon: 'koenig/kg-img-wide',
                iconClass: cardWidth === 'wide' ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this.setLayoutWide)
            }, {
                title: 'Full',
                icon: 'koenig/kg-img-full',
                iconClass: cardWidth === 'full' ? 'fill-green-l2' : 'fill-white',
                action: run.bind(this, this.setLayoutFull)
            }, {
                divider: true
            }]
        };
    }

    updateImageDimensions() {
        let beforeImage = this.args.payload.beforeImage;
        let afterImage = this.args.payload.afterImage;

        let smallestImageWidth = Math.min(
            beforeImage ? beforeImage.width : Infinity,
            afterImage ? afterImage.width : Infinity
        );

        try {
            this.imageWidth = Math.min(
                smallestImageWidth,
                parseInt(getComputedStyle(this.element).getPropertyValue('width'))
            );
        } catch (err) {
            this.imageWidth = Math.min(
                smallestImageWidth,
                0
            );
        }
    }

    constructor(owner, args) {
        super(owner, args);
        args.registerComponent(this);

        let placeholders = ['summer', 'mountains', 'ufo-attack'];
        this.placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];
        if (!args.payload.cardWidth) {
            args.payload.cardWidth = 'wide';
        }
        if (!args.payload.startingPosition) {
            args.payload.startingPosition = 50;
        }
        if (!args.payload.caption) {
            args.payload.caption = null;
        }
    }

    setupListeners() {
        this.updateImageDimensions();
        const handleResize = () => {
            this.updateImageDimensions();
        };
        window.addEventListener('resize', handleResize);
        this.willDestroy = () => {
            window.removeEventListener('resize', handleResize);
        };
    }

    @action
    preventDefault(e) {
        e.preventDefault();
    }

    @action
    stopPropagation(e) {
        e.stopPropagation();
    }

    @action
    removeFocus(e) {
        e.target.blur();
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
        this.setupListeners();
    }

    @action
    uploadStart(file) {
        return new Promise((resolve) => {
            let objectURL = URL.createObjectURL(file);
            let image = new Image();
            image.addEventListener('load', () => {
                let id = this.selectingFile;
                this.selectingFile = false;
                let metadata = {
                    id: id
                };
                resolve(metadata);
            });
            image.src = objectURL;
        });
    }

    @action
    uploadSuccess(file, metadata) {
        let image = new Image();
        image.addEventListener('load', () => {
            let imageData = {
                src: file.url,
                width: image.naturalWidth,
                height: image.naturalHeight
            };
            let prop = `${metadata.id}Image`;
            this.args.payload[prop] = imageData;
            this.updateImageDimensions();
        });
        image.src = file.url;
    }

    @action
    setLayoutWide() {
        this.args.payload.cardWidth = 'wide';
        run.scheduleOnce('afterRender', this, this.updateImageDimensions);
    }

    @action
    setLayoutFull() {
        this.args.payload.cardWidth = 'full';
        run.scheduleOnce('afterRender', this, this.updateImageDimensions);
    }

    @action
    setStartingPosition(event) {
        this.args.payload.startingPosition = Math.min(100, Math.max(0, parseInt(event.target.value)));
    }

    @action
    selectBeforeImage() {
        this.selectingFile = 'before';
        this._triggerFileDialog();
    }

    @action
    selectAfterImage() {
        this.selectingFile = 'after';
        this._triggerFileDialog();
    }

    _triggerFileDialog(event) {
        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        fileInput?.click();
    }

    @action
    uploadFailed() {
    }

    @action
    handleErrors() {
    }

    @action
    setCaption(caption) {
        this.args.payload.caption = caption;
    }

    @action
    leaveEditMode() {
        if (this.isEmpty) {
            // afterRender is required to avoid double modification of `isSelected`
            // TODO: see if there's a way to avoid afterRender
            run.scheduleOnce('afterRender', this, this.args.deleteCard);
        }
    }
}
