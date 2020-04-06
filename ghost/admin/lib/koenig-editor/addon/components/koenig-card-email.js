import Browser from 'mobiledoc-kit/utils/browser';
import Component from '@ember/component';
import layout from '../templates/components/koenig-card-email';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,

    // closure actions
    selectCard() {},
    deselectCard() {},
    editCard() {},
    saveCard() {},
    deleteCard() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},
    addParagraphAfterCard() {},
    registerComponent() {},

    init() {
        this._super(...arguments);
        this.registerComponent(this);
    },

    actions: {
        updateHtml(html) {
            this._updatePayloadAttr('html', html);
        },

        registerEditor(textReplacementEditor) {
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
        },

        leaveEditMode() {
            if (isBlank(this.payload.html)) {
                // afterRender is required to avoid double modification of `isSelected`
                // TODO: see if there's a way to avoid afterRender
                run.scheduleOnce('afterRender', this, this.deleteCard);
            }
        }
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    },

    /* key commands ----------------------------------------------------------*/

    _enter(modifier) {
        if (this.isEditing && (modifier === 'meta' || (modifier === 'crtl' && Browser.isWin()))) {
            this.editCard();
        }
    }
});
