import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
@classic
export default class ReactEditLoadingController extends Controller {
    @service ui;
}
