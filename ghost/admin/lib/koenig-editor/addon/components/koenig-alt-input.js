import Component from '@ember/component';
import layout from '../templates/components/koenig-alt-input';
import {action, computed} from '@ember/object';
import {kgStyle} from '../helpers/kg-style';
import {inject as service} from '@ember/service';

export default Component.extend({
    koenigUi: service(),

    tagName: 'figcaption',
    classNameBindings: ['figCaptionClass'],
    layout,

    alt: '',
    placeholder: '',

    update() {},
    addParagraphAfterCard() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},

    figCaptionClass: computed(function () {
        return `${kgStyle(['figcaption'])} w-100 relative`;
    }),

    didInsertElement() {
        this._super(...arguments);
        this.element.querySelector('input').focus();
    },

    willDestroyElement() {
        this._super(...arguments);
        this.koenigUi.captionLostFocus(this);
    },

    onInput: action(function (event) {
        this.update(event.target.value);
    }),

    onKeydown: action(function (event) {
        let {selectionStart, selectionEnd, value} = event.target;
        let noSelection = selectionStart === selectionEnd;

        let {altKey, ctrlKey, metaKey, shiftKey} = event;
        let hasModifier = altKey || ctrlKey || metaKey || shiftKey;

        if (hasModifier) {
            return;
        }

        switch (event.key) {
        case 'Enter':
            event.preventDefault();
            event.target.blur();
            this.addParagraphAfterCard();
            break;

        case 'Escape':
            event.target.blur();
            break;

        case 'ArrowUp':
        case 'ArrowLeft':
            if (noSelection && selectionStart === 0) {
                event.preventDefault();
                event.target.blur();
                this.moveCursorToPrevSection();
            }
            break;

        case 'ArrowRight':
        case 'ArrowDown':
            if (noSelection && selectionEnd === value.length) {
                event.preventDefault();
                event.target.blur();
                this.moveCursorToNextSection();
            }
            break;

        default:
            break;
        }
    })
});
