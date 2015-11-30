import Ember from 'ember';
import TextInputMixin from 'ghost/mixins/text-input';

const {TextArea} = Ember;

export default TextArea.extend(TextInputMixin, {
    classNames: 'gh-input'
});
