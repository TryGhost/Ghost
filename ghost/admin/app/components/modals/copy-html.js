import ModalComponent from 'ghost-admin/components/modals/base';
import {alias} from '@ember/object/computed';

export default ModalComponent.extend({
    generatedHtml: alias('model')
});
