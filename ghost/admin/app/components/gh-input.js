import OneWayInput from 'ember-one-way-controls/components/one-way-input';
import TextInputMixin from 'ghost-admin/mixins/text-input';

export default OneWayInput.extend(TextInputMixin, {
    classNames: 'gh-input',

    // prevent default TAB behaviour if we have a keyEvent for it
    keyDown(event) {
        if (event.keyCode === 9 && this.get('keyEvents.9')) {
            event.preventDefault();
        }

        this._super(...arguments);
    }
});
