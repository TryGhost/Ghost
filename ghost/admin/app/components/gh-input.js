import Ember from 'ember';
import TextInputMixin from 'ghost-admin/mixins/text-input';

const {TextField} = Ember;

export default TextField.extend(TextInputMixin, {
    classNames: 'gh-input'
});
