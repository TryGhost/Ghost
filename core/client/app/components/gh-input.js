import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';

export default Ember.TextField.extend(TextInputMixin, {
    classNames: 'gh-input'
});
