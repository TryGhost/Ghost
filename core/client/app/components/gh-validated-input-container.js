import Ember from 'ember';
import {InvokeActionMixin} from 'ember-invoke-action';
import ValidatedInputMixin from 'ghost/mixins/validated-input';

const {Component} = Ember;

export default Component.extend(InvokeActionMixin, ValidatedInputMixin, {
    classNames: 'form-group',
    classNameBindings: 'state'
});
