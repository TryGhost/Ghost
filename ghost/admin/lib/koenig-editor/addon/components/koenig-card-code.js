import Component from '@glimmer/component';
import Ember from 'ember';
import {action} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {htmlSafe} from '@ember/template';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

const {Handlebars} = Ember;
const {countWords} = ghostHelperUtils;

const CM_MODE_MAP = {
    html: 'htmlmixed',
    xhtml: 'htmlmixed',
    hbs: 'handlebars',
    js: 'javascript'
};

export default class KoenigCardCode extends Component {
    @tracked showLanguageInput = true;

    get isEmpty() {
        return isBlank(this.args.payload.code);
    }

    get counts() {
        return {wordCount: countWords(this.args.payload.code)};
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
                action: this.args.editCard
            }]
        };
    }

    get escapedCode() {
        let escapedCode = Handlebars.Utils.escapeExpression(this.args.payload.code);
        return htmlSafe(escapedCode);
    }

    get cmMode() {
        let {language} = this.args.payload;
        return CM_MODE_MAP[language] || language;
    }

    get cardStyle() {
        let style = this.args.isEditing ? 'background-color: #f4f8fb; border-color: #f4f8fb' : '';
        return htmlSafe(style);
    }

    get languageInputStyle() {
        let styles = ['top: 6px', 'right: 6px'];
        if (!this.showLanguageInput) {
            styles.push('opacity: 0');
        }
        return htmlSafe(styles.join('; '));
    }

    constructor() {
        super(...arguments);
        let payload = this.args.payload || {};

        // CodeMirror errors on a `null` or `undefined` value
        if (!payload.code) {
            payload.code = '';
        }

        this.payload = payload;

        this.args.registerComponent(this);
    }

    @action
    updateCode(code) {
        this._hideLanguageInput();
        this._updatePayloadAttr('code', code);
    }

    @action
    updateCaption(caption) {
        this._updatePayloadAttr('caption', caption);
    }

    @action
    updateLanguage(event) {
        this._updatePayloadAttr('language', event.target.value);
    }

    @action
    enterEditMode() {
        this._addMousemoveHandler();
    }

    @action
    leaveEditMode() {
        this._removeMousemoveHandler();

        if (this.isEmpty) {
            // afterRender is required to avoid double modification of `isSelected`
            // TODO: see if there's a way to avoid afterRender
            run.scheduleOnce('afterRender', this, this.args.deleteCard);
        }
    }

    _updatePayloadAttr(attr, value) {
        let payload = this.args.payload;
        let save = this.args.saveCard;

        payload[attr] = value;

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    }

    _hideLanguageInput() {
        this.showLanguageInput = false;
    }

    _showLanguageInput() {
        this.showLanguageInput = true;
    }

    _addMousemoveHandler() {
        this._mousemoveHandler = run.bind(this, this._showLanguageInput);
        window.addEventListener('mousemove', this._mousemoveHandler);
    }

    _removeMousemoveHandler() {
        window.removeEventListener('mousemove', this._mousemoveHandler);
    }
}
