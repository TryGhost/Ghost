import ModalComponent from 'ghost-admin/components/modal-base';
import {alias} from '@ember/object/computed';

export default ModalComponent.extend({
    member: alias('model')
});