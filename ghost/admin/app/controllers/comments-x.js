import Controller from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class CommentsXController extends Controller {
    @service session;
    @inject config;
}
