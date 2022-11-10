import Controller, {inject as controller} from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class PostsLoadingController extends Controller {
    @controller('posts') postsController;

    @service session;
    @service ui;

    @inject config;

    get availableTypes() {
        return this.postsController.availableTypes;
    }

    get selectedType() {
        return this.postsController.selectedType;
    }

    get selectedVisibility() {
        return this.postsController.selectedVisibility;
    }

    get availableVisibilities() {
        return this.postsController.availableVisibilities;
    }

    get availableTags() {
        return this.postsController.availableTags;
    }

    get selectedTag() {
        return this.postsController.selectedTag;
    }

    get availableAuthors() {
        return this.postsController.availableAuthors;
    }

    get selectedAuthor() {
        return this.postsController.selectedAuthor;
    }

    get availableOrders() {
        return this.postsController.availableOrders;
    }

    get selectedOrder() {
        return this.postsController.selectedOrder;
    }
}
