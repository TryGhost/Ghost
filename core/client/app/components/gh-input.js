import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';

var Input = Ember.TextField.extend(TextInputMixin, {
    classNames: 'gh-input'
});

export default Input;
