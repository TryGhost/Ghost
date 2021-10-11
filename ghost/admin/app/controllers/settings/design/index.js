import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class DesignIndexController extends Controller {
    @service config;
    @service settings;
    @service themeManagement
}
