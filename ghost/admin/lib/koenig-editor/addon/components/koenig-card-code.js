import Component from '@ember/component';
import Ember from 'ember';
import countWords from '../utils/count-words';
import layout from '../templates/components/koenig-card-code';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

const {Handlebars} = Ember;

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,
    headerOffset: 0,

    // closure actions
    editCard() {},
    saveCard() {},
    selectCard() {},
    deselectCard() {},
    deleteCard() {},
    registerComponent() {},

    counts: computed('payload.code', function () {
        return {wordCount: countWords(this.payload.code)};
    }),

    toolbar: computed('isEditing', function () {
        if (!this.isEditing) {
            return {
                items: [{
                    buttonClass: 'fw4 flex items-center white',
                    icon: 'koenig/kg-edit',
                    iconClass: 'fill-white',
                    title: 'Edit',
                    text: '',
                    action: run.bind(this, this.editCard)
                }]
            };
        }
    }),

    escapedCode: computed('payload.code', function () {
        let escapedCode = Handlebars.Utils.escapeExpression(this.payload.code);
        return htmlSafe(escapedCode);
    }),

    init() {
        this._super(...arguments);
        let payload = this.payload || {};

        // CodeMirror errors on a `null` or `undefined` value
        if (!payload.code) {
            set(payload, 'code', '');
        }

        this.set('payload', payload);

        this.registerComponent(this);
    },

    actions: {
        updateCode(code) {
            this._updatePayloadAttr('code', code);
        },

        leaveEditMode() {
            if (isBlank(this.payload.code)) {
                // afterRender is required to avoid double modification of `isSelected`
                // TODO: see if there's a way to avoid afterRender
                run.scheduleOnce('afterRender', this, function () {
                    this.deleteCard();
                });
            }
        }
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    }
});
