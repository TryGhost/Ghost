import * as storage from '../utils/localstorage';
import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {EmojiButton} from '@joeattardi/emoji-button';
import {action} from '@ember/object';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const storageKey = 'gh-kg-callout-emoji';

export default class KoenigCardCalloutComponent extends Component {
    @service config;
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    get isEmpty() {
        return isBlank(this.args.payload.calloutText) && isBlank(this.args.payload.calloutEmoji);
    }

    backgroundColors = [
        {name: 'Grey', color: 'grey'},
        {name: 'White', color: 'white'},
        {name: 'Blue', color: 'blue'},
        {name: 'Green', color: 'green'},
        {name: 'Yellow', color: 'yellow'},
        {name: 'Red', color: 'red'},
        {name: 'Pink', color: 'pink'},
        {name: 'Purple', color: 'purple'},
        {name: 'Brand color', color: 'accent'}
    ];
    latestEmojiUsed = null;

    @tracked
    isPickerVisible = false;

    get selectedBackgroundColor() {
        return this.backgroundColors.find(option => option.color === this.args.payload.backgroundColor);
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

    get defaultEmoji() {
        return this.latestEmojiUsed || storage.get(storageKey) || '💡';
    }

    constructor() {
        super(...arguments);
        this.args.registerComponent(this);

        const payloadDefaults = {
            calloutEmoji: this.defaultEmoji,
            calloutText: '',
            backgroundColor: 'grey'
        };

        Object.entries(payloadDefaults).forEach(([key, value]) => {
            if (this.args.payload[key] === undefined) {
                this._updatePayloadAttr(key, value);
            }
        });

        this.picker = new EmojiButton({
            position: 'bottom',
            recentsCount: 24,
            showPreview: false,
            initialCategory: 'recents'
        });

        this.picker.on('emoji', (selection) => {
            this.setCalloutEmoji(selection.emoji);
        });

        this.picker.on('hidden', () => {
            this.isPickerVisible = false;
        });
    }

    // required for snippet rects to be calculated - editor reaches in to component,
    // expecting a non-Glimmer component with a .element property
    @action
    registerElement(element) {
        this.element = element;
    }

    @action
    setCalloutText(text) {
        this._updatePayloadAttr('calloutText', text);
    }

    @action
    setCalloutEmoji(emoji) {
        // Store in payload
        this._updatePayloadAttr('calloutEmoji', emoji);
        // Store in component in case the emoji is toggled off and then on
        this.latestEmojiUsed = emoji;
        // Store in localStorage for the next callout to use the same emoji
        storage.set(storageKey, emoji);
    }

    @action
    setBackgroundColor(option) {
        this._updatePayloadAttr('backgroundColor', option.color);
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

    @action
    registerEditor(textReplacementEditor) {
        let commands = {
            'META+ENTER': run.bind(this, this._enter, 'meta'),
            'CTRL+ENTER': run.bind(this, this._enter, 'ctrl'),
            ENTER: run.bind(this, this._addParagraphAfterCard)
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

        run.scheduleOnce('afterRender', this, this._placeCursorAtEnd);
    }

    @action
    changeEmoji(event) {
        this.picker.showPicker(event.target);
        this.isPickerVisible = true;
    }

    @action
    toggleEmoji() {
        this._updatePayloadAttr('calloutEmoji', this.args.payload.calloutEmoji ? '' : this.defaultEmoji);
    }

    _enter(modifier) {
        if (this.args.isEditing && (modifier === 'meta' || (modifier === 'crtl' && Browser.isWin()))) {
            this.args.editCard();
        }
    }

    _addParagraphAfterCard() {
        if (this.args.isEditing) {
            this.args.addParagraphAfterCard();
        }
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
}
