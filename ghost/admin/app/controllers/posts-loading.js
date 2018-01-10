/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller, {inject as controller} from '@ember/controller';
import {readOnly} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Controller.extend({

    postsController: controller('posts'),
    session: service(),

    availableTypes: readOnly('postsController.availableTypes'),
    selectedType: readOnly('postsController.selectedType'),
    availableTags: readOnly('postsController.availableTags'),
    selectedTag: readOnly('postsController.selectedTag'),
    availableAuthors: readOnly('postsController.availableAuthors'),
    selectedAuthor: readOnly('postsController.selectedAuthor'),
    availableOrders: readOnly('postsController.availableOrders'),
    selectedOrder: readOnly('postsController.selectedOrder')

});
