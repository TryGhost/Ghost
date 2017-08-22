import Evented from '@ember/object/evented';
import Mixin from '@ember/object/mixin';

/*
  Dropdowns and their buttons are evented and do not propagate clicks.
*/
export default Mixin.create(Evented, {
    classNameBindings: ['isOpen:open:closed'],
    isOpen: false,

    click(event) {
        this._super(event);

        return event.stopPropagation();
    }
});
