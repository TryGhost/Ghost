import Component from '@ember/component';
import layout from '../templates/components/koenig-caption-input';
import {computed} from '@ember/object';
import {kgStyle} from 'ember-cli-ghost-spirit/helpers/kg-style';
import {run} from '@ember/runloop';

export default Component.extend({
    tagName: 'figcaption',
    classNameBindings: ['figCaptionClass'],
    layout,

    caption: '',
    placeholder: '',

    _keypressHandler: null,
    _keydownHandler: null,

    update() {},
    onDidInsertElement() {},

    figCaptionClass: computed(function () {
        return `${kgStyle(['figcaption'])} w-100`;
    }),

    didReceiveAttrs() {
        this._super(...arguments);

        if (this.captureInput && !this._keypressHandler) {
            this._attachHandlers();
        }

        if (!this.captureInput && this._keypressHandler) {
            this._detachHandlers();
        }
    },

    willDestroyElement() {
        this._super(...arguments);
        this._detachHandlers();
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
            event.preventDefault();
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
    }
});
