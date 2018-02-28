import TextField from '@ember/component/text-field';
import TextInputMixin from 'ghost-admin/mixins/text-input';

export default TextField.extend(TextInputMixin, {
    classNames: 'gh-input'
});
