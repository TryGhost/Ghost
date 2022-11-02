import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {IMAGE_EXTENSIONS, IMAGE_MIME_TYPES} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';

export default class KoenigCardHeaderComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    get isButtonIncomplete() {
        const {buttonUrl, buttonText} = this.args.payload;
        return !buttonUrl || !buttonText;
    }

    get isEmpty() {
        const {header, subheader, buttonUrl, buttonText, buttonEnabled} = this.args.payload;

        return isBlank(header) && isBlank(subheader) && (!buttonEnabled || (isBlank(buttonUrl) || isBlank(buttonText)));
    }

    get isIncomplete() {
        const {header} = this.args.payload;

        return isBlank(header);
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

    get hasSubheader() {
        return this.args.payload.subheader && Boolean(this.args.payload.subheader.replace(/(<br *\/?>)+$/ig, '').trim());
    }

    get backgroundImageStyle() {
        if (this.args.payload.backgroundImageSrc) {
            return ` background-image: url(${this.args.payload.backgroundImageSrc});`;
        }
        return '';
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {
            size: 'small',
            style: 'dark',
            buttonEnabled: false
        };

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this._updatePayloadAttr(key, value);
            }
        });
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
    }

    @action
    registerHeaderEditor(textReplacementEditor) {
        let commands = {
            ENTER: this.handleHeaderTab.bind(this),
            TAB: this.handleHeaderTab.bind(this),
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

    handleHeaderTab() {
        let contentInput = this.element.querySelector('.kg-header-card-subheader .koenig-basic-html-input__editor');

        if (contentInput) {
            contentInput.focus();
        }
    }

    @action
    registerSubheaderEditor(textReplacementEditor) {
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
    setHeader(content) {
        this._updatePayloadAttr('header', content);
    }

    @action
    setSubheader(content) {
        this._updatePayloadAttr('subheader', content);
    }

    @action
    setButtonUrl(event) {
        this._updatePayloadAttr('buttonUrl', event.target.value);
        if (!this.args.payload.buttonEnabled) {
            this._updatePayloadAttr('buttonEnabled', true);
        }
    }

    @action
    setButtonText(event) {
        this._updatePayloadAttr('buttonText', event.target.value);
        if (!this.args.payload.buttonEnabled) {
            this._updatePayloadAttr('buttonEnabled', true);
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
        let headingInput = this.element.querySelector('.kg-header-card-header .koenig-basic-html-input__editor');

        if (headingInput) {
            headingInput.focus();
        }
    }

    @action
    toggleButton() {
        this._updatePayloadAttr('buttonEnabled', !this.args.payload.buttonEnabled);
    }

    @action
    setSize(size) {
        if (['small', 'medium', 'large'].includes(size)) {
            this._updatePayloadAttr('size', size);
        }
    }

    @action
    setStyle(style) {
        if (['dark', 'light', 'accent', 'image'].includes(style)) {
            this._updatePayloadAttr('style', style);
            if (style === 'image' && !this.args.payload.backgroundImageSrc) {
                this.triggerFileDialog();
            }
        }
    }

    @action
    triggerFileDialog(event) {
        const target = event?.target || this.element;

        const cardElem = target.closest('.__mobiledoc-card');
        const fileInput = cardElem?.querySelector('input[type="file"]');

        if (fileInput) {
            fileInput.click();
        }
    }

    @action
    backgroundImageUploadCompleted([image]) {
        this.args.editor.run(() => {
            this._updatePayloadAttr('backgroundImageSrc', image.url);
        });
    }

    @action
    deleteBackgroundImage() {
        this._updatePayloadAttr('backgroundImageSrc', null);
    }
}
