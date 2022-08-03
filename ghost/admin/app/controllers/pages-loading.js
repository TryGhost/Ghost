import PostsLoadingController from './posts-loading';
import classic from 'ember-classic-decorator';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
@classic
export default class PagesLoadingController extends PostsLoadingController {
    @controller('pages')
        postsController;

    @service ui;
}
