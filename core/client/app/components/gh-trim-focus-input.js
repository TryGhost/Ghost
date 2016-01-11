import Ember from 'ember';
import FocusInputMixin from 'ghost/mixins/focus-input';

const {TextField} = Ember;

export default TextField.extend(FocusInputMixin, {
    focusOut() {
        let text = this.$().val();

        this.$().val(text.trim());
        this._super(...arguments);
    }
});
