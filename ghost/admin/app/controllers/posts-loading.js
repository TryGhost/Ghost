import Controller from '@ember/controller';
import {inject as injectController} from '@ember/controller';
import {inject as injectService} from '@ember/service';
import {readOnly} from '@ember/object/computed';

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
