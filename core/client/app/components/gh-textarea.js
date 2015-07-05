import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';

var TextArea = Ember.TextArea.extend(TextInputMixin, {
    classNames: 'gh-input'
});

export default TextArea;
