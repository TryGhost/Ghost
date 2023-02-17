import Controller from '@ember/controller';
/* eslint-disable ghost/ember/alias-model-in-controller */
import classic from 'ember-classic-decorator';
import {inject as service} from '@ember/service';

@classic
export default class WebsocketsController extends Controller {
    @service feature;
    
    init() {
        super.init(...arguments);
    }
}