import PostsLoadingController from './posts-loading';
import {inject as controller} from '@ember/controller';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default PostsLoadingController.extend({
    postsController: controller('pages')
});
