import ModalComponent from 'ghost-admin/components/modals/base';
import {alias} from 'ember-computed';

export default ModalComponent.extend({
    generatedHtml: alias('model')
});
