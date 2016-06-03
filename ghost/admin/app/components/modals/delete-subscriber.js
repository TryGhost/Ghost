import Ember from 'ember';
import ModalComponent from 'ghost-admin/components/modals/base';
import {invokeAction} from 'ember-invoke-action';

const {computed} = Ember;
const {alias} = computed;

export default ModalComponent.extend({

    submitting: false,

    subscriber: alias('model'),

    actions: {
        confirm() {
            this.set('submitting', true);

            invokeAction(this, 'confirm').finally(() => {
                this.set('submitting', false);
            });
        }
    }
});
