import PostsLoadingController from './posts-loading';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default PostsLoadingController.extend({
    postsController: controller('pages'),
    ui: service()
});
