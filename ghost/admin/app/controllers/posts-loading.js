import Controller, {inject as controller} from '@ember/controller';
import classic from 'ember-classic-decorator';
import {readOnly} from '@ember/object/computed';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
@classic
export default class PostsLoadingController extends Controller {
    @controller('posts')
        postsController;

    @service session;
    @service ui;
    @service config;

    @readOnly('postsController.availableTypes')
        availableTypes;

    @readOnly('postsController.selectedType')
        selectedType;

    @readOnly('postsController.selectedVisibility')
        selectedVisibility;

    @readOnly('postsController.availableVisibilities')
        availableVisibilities;

    @readOnly('postsController.availableTags')
        availableTags;

    @readOnly('postsController.selectedTag')
        selectedTag;

    @readOnly('postsController.availableAuthors')
        availableAuthors;

    @readOnly('postsController.selectedAuthor')
        selectedAuthor;

    @readOnly('postsController.availableOrders')
        availableOrders;

    @readOnly('postsController.selectedOrder')
        selectedOrder;
}
