import Ember from 'ember';

const {Mixin} = Ember;

export default Mixin.create({
    selectOnClick: false,
    stopEnterKeyDownPropagation: false,

    click(event) {
        if (this.get('selectOnClick')) {
            event.currentTarget.select();
        }
    },

    keyDown(event) {
        // stop event propagation when pressing "enter"
        // most useful in the case when undesired (global) keyboard shortcuts are getting triggered while interacting
        // with this particular input element.
        if (this.get('stopEnterKeyDownPropagation') && event.keyCode === 13) {
            event.stopPropagation();

            return true;
        }
    }
});
