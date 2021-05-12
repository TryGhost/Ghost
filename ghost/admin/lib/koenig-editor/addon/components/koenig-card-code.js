import Component from '@ember/component';
import Ember from 'ember';
import {computed} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

const {Handlebars} = Ember;
const {countWords} = ghostHelperUtils;

const CM_MODE_MAP = {
    html: 'htmlmixed',
    xhtml: 'htmlmixed',
    hbs: 'handlebars',
    js: 'javascript'
};

export default Component.extend({
    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,
    headerOffset: 0,
    showLanguageInput: true,

    // closure actions
    editCard() {},
    saveCard() {},
    selectCard() {},
    deselectCard() {},
    deleteCard() {},
    registerComponent() {},
    moveCursorToNextSection() {},
    moveCursorToPrevSection() {},
    addParagraphAfterCard() {},

    counts: computed('payload.code', function () {
        return {wordCount: countWords(this.payload.code)};
    }),

    toolbar: computed('isEditing', function () {
        if (this.isEditing) {
            return false;
        }

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
    }),

    escapedCode: computed('payload.code', function () {
        let escapedCode = Handlebars.Utils.escapeExpression(this.payload.code);
        return htmlSafe(escapedCode);
    }),

    cmMode: computed('payload.language', function () {
        let {language} = this.payload;
        return CM_MODE_MAP[language] || language;
    }),

    cardStyle: computed('isEditing', function () {
        let style = this.isEditing ? 'background-color: #f4f8fb; border-color: #f4f8fb' : '';
        return htmlSafe(style);
    }),

    languageInputStyle: computed('showLanguageInput', function () {
        let styles = ['top: 6px', 'right: 6px'];
        if (!this.showLanguageInput) {
            styles.push('opacity: 0');
        }
        return htmlSafe(styles.join('; '));
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
            this._hideLanguageInput();
            this._updatePayloadAttr('code', code);
        },

        updateCaption(caption) {
            this._updatePayloadAttr('caption', caption);
        },

        enterEditMode() {
            this._addMousemoveHandler();
        },

        leaveEditMode() {
            this._removeMousemoveHandler();

            if (isBlank(this.payload.code)) {
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

    _hideLanguageInput() {
        this.set('showLanguageInput', false);
    },

    _showLanguageInput() {
        this.set('showLanguageInput', true);
    },

    _addMousemoveHandler() {
        this._mousemoveHandler = run.bind(this, this._showLanguageInput);
        window.addEventListener('mousemove', this._mousemoveHandler);
    },

    _removeMousemoveHandler() {
        window.removeEventListener('mousemove', this._mousemoveHandler);
    }
});
