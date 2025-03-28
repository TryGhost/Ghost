import PostsLoadingController from './posts-loading';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

export default class PagesLoadingController extends PostsLoadingController {
    @controller('pages') postsController;

    @service ui;
}
