import {alias} from 'ember-computed';
import ModalComponent from 'ghost-admin/components/modals/base';

export default ModalComponent.extend({
    generatedHtml: alias('model')
});
