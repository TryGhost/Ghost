import Ember from 'ember';
import ModalComponent from 'ghost/components/modals/base';

const {computed} = Ember;
const {alias} = computed;

export default ModalComponent.extend({
    generatedHtml: alias('model')
});
