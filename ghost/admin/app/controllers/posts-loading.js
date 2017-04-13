import Controller from 'ember-controller';
import {readOnly} from 'ember-computed';
import injectController from 'ember-controller/inject';
import injectService from 'ember-service/inject';

export default Controller.extend({

    postsController: injectController('posts'),
    session: injectService(),

    availableTypes: readOnly('postsController.availableTypes'),
    selectedType: readOnly('postsController.selectedType'),
    availableTags: readOnly('postsController.availableTags'),
    selectedTag: readOnly('postsController.selectedTag'),
    availableAuthors: readOnly('postsController.availableAuthors'),
    selectedAuthor: readOnly('postsController.selectedAuthor'),
    availableOrders: readOnly('postsController.availableOrders'),
    selectedOrder: readOnly('postsController.selectedOrder')

});
