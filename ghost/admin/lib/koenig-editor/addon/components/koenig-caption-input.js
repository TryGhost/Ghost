import Component from '@ember/component';
import Key from 'mobiledoc-kit/utils/key';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {classNameBindings, tagName} from '@ember-decorators/component';
import {kgStyle} from '../helpers/kg-style';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

@classic
@tagName('figcaption')
@classNameBindings('figCaptionClass')
export default class KoenigCaptionInput extends Component {
    @service koenigUi;

    caption = '';
    captureInput = false;
    placeholder = '';
    _keypressHandler = null;
    _keydownHandler = null;
    update() {}
    addParagraphAfterCard() {}
    moveCursorToNextSection() {}
    moveCursorToPrevSection() {}

    @computed
    get figCaptionClass() {
        return `${kgStyle(['figcaption'])} w-100 relative`;
    }

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        if (this.captureInput && !this._keypressHandler) {
            this._attachHandlers();
        }

        if (!this.captureInput && this._keypressHandler) {
            this._detachHandlers();
        }
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);
        this.koenigUi.captionLostFocus(this);
        this._detachHandlers();
    }

    @action
    registerEditor(editor) {
        let commands = {
            ENTER: run.bind(this, this._enter),
            ESC: run.bind(this, this._escape),
            UP: run.bind(this, this._upOrLeft),
            LEFT: run.bind(this, this._upOrLeft),
            DOWN: run.bind(this, this._rightOrDown),
            RIGHT: run.bind(this, this._rightOrDown)
        };

        Object.keys(commands).forEach((str) => {
            editor.registerKeyCommand({
                str,
                run() {
                    return commands[str](editor, str);
                }
            });
        });

        this.editor = editor;
    }

    @action
    handleEnter() {
        this.addParagraphAfterCard();
    }

    // events ------------------------------------------------------------------

    focusIn() {
        this.koenigUi.captionGainedFocus(this);
    }

    focusOut() {
        this.koenigUi.captionLostFocus(this);
    }

    // private -----------------------------------------------------------------

    _attachHandlers() {
        if (!this._keypressHandler) {
            this._keypressHandler = run.bind(this, this._handleKeypress);
            window.addEventListener('keypress', this._keypressHandler);
        }
    }

    _detachHandlers() {
        window.removeEventListener('keypress', this._keypressHandler);
        this._keypressHandler = null;
        this._keydownHandler = null;
    }

    // only fires if the card is selected, moves focus to the caption input so
    // that it's possible to start typing without explicitly focusing the input
    _handleKeypress(event) {
        let key = new Key(event);
        let {editor} = this;

        if (event.target.matches('[data-kg="editor"]') && editor && !editor._hasFocus() && key.isPrintableKey() && !key.isEnter()) {
            editor.focus();
            editor.run((postEditor) => {
                postEditor.insertText(editor.post.tailPosition(), key.toString());
            });

            event.preventDefault();
        }
    }

    /* key commands ----------------------------------------------------------*/

    _enter() {
        this.send('handleEnter');
    }

    _escape(editor) {
        editor.element.blur();
        this.deselectCard();
        this.selectCard();
    }

    _upOrLeft(editor, key) {
        let {isCollapsed, head} = editor.range;

        if (isCollapsed && head.isEqual(head.section.headPosition())) {
            return this.moveCursorToPrevSection();
        }

        // we're simulating a text input so up/down move the cursor to the
        // beginning/end of the input
        if (isCollapsed && key === 'UP') {
            return editor.selectRange(head.section.headPosition().toRange());
        }

        return false;
    }

    _rightOrDown(editor, key) {
        let {isCollapsed, tail} = editor.range;

        if (isCollapsed && tail.isEqual(tail.section.tailPosition())) {
            return this.moveCursorToNextSection();
        }

        // we're simulating a text input so up/down move the cursor to the
        // beginning/end of the input
        if (isCollapsed && key === 'DOWN') {
            return editor.selectRange(tail.section.tailPosition().toRange());
        }

        return false;
    }
}
