import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {alias} from '@ember/object/computed';

@classic
export default class SiteController extends Controller {
    @alias('model')
        guid;
}
