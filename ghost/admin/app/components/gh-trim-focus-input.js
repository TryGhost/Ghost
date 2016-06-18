/*global device*/
import Ember from 'ember';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {InvokeActionMixin} from 'ember-invoke-action';

const {Component, computed} = Ember;

/**
 * This doesn't override the OneWayInput component because
 * we need finer control. It borrows
 * parts from both the OneWayInput component and Ember's default
 * input component
 */
const TrimFocusInputComponent = Component.extend(InvokeActionMixin, {
    tagName: 'input',
    type: 'text',
    focus: true,
    classNames: 'gh-input',

    // This is taken from Ember's input component
    attributeBindings: [
        'autofocus',
        '_value:value',
        'accept',
        'autocomplete',
        'autosave',
        'dir',
        'formaction',
        'formenctype',
        'formmethod',
        'formnovalidate',
        'formtarget',
        'height',
        'inputmode',
        'lang',
        'list',
        'multiple',
        'name',
        'pattern',
        'size',
        'step',
        'type',
        'value',
        'width'
    ],

    // These were in Ember's component
    // so they are reproduced here
    size: null,
    pattern: null,
    max: null,
    min: null,

    _value: boundOneWay('value'),

    autofocus: computed(function () {
        if (this.get('focus')) {
            return (device.ios()) ? false : 'autofocus';
        }

        return false;
    }),

    keyEvents: {
        '13': 'onenter',
        '27': 'onescape'
    },

    input() {
        this._handleChangeEvent();
    },

    change() {
        this._handleChangeEvent();
    },

    keyUp(event) {
        this._interpretKeyEvents(event);
    },

    _interpretKeyEvents(event) {
        let method = this.get(`keyEvents.${event.keyCode}`);

        if (method) {
            this._sanitizedValue = null;
            this._handleChangeEvent(method);
        }
    },

    _handleChangeEvent(method = 'update') {
        let value = this.readDOMAttr('value');
        this.invokeAction(method, value);
    },

    _trimValue() {
        let text = this.readDOMAttr('value');
        this.invokeAction('update', text.trim());
    },

    didInsertElement() {
        this._super(...arguments);
        this._setFocus();
    },

    _setFocus() {
        // Until mobile safari has better support
        // for focusing, we just ignore it
        if (this.get('focus') && !device.ios()) {
            this.$().focus();
        }
    },

    focusOut() {
        this._super(...arguments);
        this._trimValue();
    }
});

TrimFocusInputComponent.reopenClass({
    positionalParams: ['value']
});

export default TrimFocusInputComponent;
