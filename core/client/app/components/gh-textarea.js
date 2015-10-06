import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';

export default Ember.TextArea.extend(TextInputMixin, {
    classNames: 'gh-input'
});
