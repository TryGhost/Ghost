import ModalComponent from 'ghost-admin/components/modal-base';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    // Allowed actions
    confirm: () => {},

    confirmTask: task(function* () {
        yield this.confirm();
    })
});
