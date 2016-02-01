import Ember from 'ember';
import LiquidTether from 'liquid-tether/components/liquid-tether';

const {
    computed,
    inject: {service}
} = Ember;

export default LiquidTether.extend({
    to: 'tour-item',
    attachment: 'middle center',
    overlayClass: 'tour-background',

    target: computed.alias('model.element'),
    targetAttachment: computed.alias('model.position'),

    dropdown: service(),

    actions: {
        optOut() {
            this.get('dropdown').closeDropdowns();
            this.sendAction('optOut');
        },

        closeItem() {
            this.get('dropdown').closeDropdowns();
            this.sendAction('closeItem');
        }
    }
});
