import Controller from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class PostsXController extends Controller {
    @service feature;
    @service session;

    @inject config;

    fromAnalytics = false;
}
