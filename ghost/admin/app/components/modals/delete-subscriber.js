import ModalComponent from 'ghost-admin/components/modals/base';
import {alias} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({

    subscriber: alias('model'),

    deleteSubscriber: task(function* () {
        yield invokeAction(this, 'confirm');
    }).drop(),

    actions: {
        confirm() {
            this.get('deleteSubscriber').perform();
        }
    }
});
