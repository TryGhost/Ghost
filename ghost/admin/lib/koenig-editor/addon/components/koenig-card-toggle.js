import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {action} from '@ember/object';
import {formatTextReplacementHtml} from './koenig-text-replacement-html-input';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';

export default class KoenigCardToggleComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

    get formattedHeading() {
        return formatTextReplacementHtml(this.args.payload.heading);
    }

    get formattedContent() {
        return formatTextReplacementHtml(this.args.payload.content);
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

        const payloadDefaults = {};

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
    setContentText(text) {
        this._updatePayloadAttr('content', text);
    }

    @action
    setHeadingText(text) {
        this._updatePayloadAttr('heading', text);
    }

    @action
    leaveEditMode() {
        const {html, content, heading} = this.args.payload;

        if (isBlank(html) && isBlank(heading) && isBlank(content)) {
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

    @action
    handleTab() {
        let contentInput = this.element.querySelector('.kg-toggle-card-content .koenig-basic-html-textarea__editor');

        if (contentInput) {
            contentInput.focus();
        }
    }

    @action
    registerContentEditor(textReplacementEditor) {
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

    @action
    registerHeadingEditor(textReplacementEditor) {
        let commands = {
            ENTER: this.handleTab,
            TAB: this.handleTab,
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

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }

    _focusInput() {
        let headingInput = this.element.querySelector('.kg-toggle-card-heading .koenig-basic-html-input__editor');

        if (headingInput) {
            headingInput.focus();
        }
    }
}
