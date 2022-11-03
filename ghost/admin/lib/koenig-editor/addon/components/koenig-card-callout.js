import * as storage from '../utils/localstorage';
import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@glimmer/component';
import {EmojiButton} from '@joeattardi/emoji-button';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {set} from '@ember/object';
import {tracked} from '@glimmer/tracking';

const storageKey = 'gh-kg-callout-emoji';

export default class KoenigCardCalloutComponent extends Component {
    @service feature;
    @service store;
    @service membersUtils;
    @service ui;

    @inject config;

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

    @tracked isPickerVisible = false;

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

        // Create a container for the emoji picker that will prevent clicks deselecting the card.
        // Container element survives beyond this component's lifecycle so it can be re-used
        // TODO: if emoji button is re-used elsewhere encapsulate behaviour into a modifier/component
        let emojiButtonContainer = document.getElementById('emoji-button-container');
        if (!emojiButtonContainer) {
            emojiButtonContainer = document.createElement('div');
            emojiButtonContainer.id = 'emoji-button-container';

            emojiButtonContainer.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
            });

            document.body.appendChild(emojiButtonContainer);
        }

        this.picker = new EmojiButton({
            position: 'bottom',
            recentsCount: 24,
            showPreview: false,
            initialCategory: 'recents',
            rootElement: emojiButtonContainer
        });

        this.picker.on('emoji', (selection) => {
            this.setCalloutEmoji(selection.emoji);
        });

        this.picker.on('hidden', () => {
            this.isPickerVisible = false;
        });
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.picker?.destroyPicker();
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

        this.picker?.hidePicker();
    }

    @action
    focusElement(selector, event) {
        event.preventDefault();
        document.querySelector(selector)?.focus();
    }

    @action
    registerEditor(calloutTextEditor) {
        let commands = {
            'META+ENTER': run.bind(this, this._metaEnter, 'meta'),
            'CTRL+ENTER': run.bind(this, this._metaEnter, 'ctrl'),
            ENTER: run.bind(this, this.args.addParagraphAfterCard)
        };

        Object.keys(commands).forEach((str) => {
            calloutTextEditor.registerKeyCommand({
                str,
                run() {
                    return commands[str](calloutTextEditor, str);
                }
            });
        });

        this._calloutTextEditor = calloutTextEditor;

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

    _metaEnter(modifier) {
        if (this.args.isEditing && (modifier === 'meta' || (modifier === 'ctrl' && Browser.isWin()))) {
            this.args.editCard();
        }
    }

    _placeCursorAtEnd() {
        if (!this._calloutTextEditor) {
            return;
        }

        let tailPosition = this._calloutTextEditor.post.tailPosition();
        let rangeToSelect = tailPosition.toRange();
        this._calloutTextEditor.selectRange(rangeToSelect);
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        this.args.saveCard?.(payload, false);
    }
}
