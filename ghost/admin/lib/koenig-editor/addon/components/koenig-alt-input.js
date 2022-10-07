import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {classNameBindings, tagName} from '@ember-decorators/component';
import {kgStyle} from '../helpers/kg-style';
import {inject as service} from '@ember/service';

@classic
@tagName('figcaption')
@classNameBindings('figCaptionClass')
export default class KoenigAltInput extends Component {
    @service koenigUi;

    alt = '';
    placeholder = '';

    update() {}
    addParagraphAfterCard() {}
    moveCursorToNextSection() {}
    moveCursorToPrevSection() {}

    @computed
    get figCaptionClass() {
        return `${kgStyle(['figcaption'])} w-100 relative`;
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this.element.querySelector('input').focus();
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this.koenigUi.captionLostFocus(this);
    }

    @action
    onInput(event) {
        this.update(event.target.value);
    }

    @action
    onKeydown(event) {
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
    }
}
