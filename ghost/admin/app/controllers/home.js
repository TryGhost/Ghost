import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';

export default class HomeController extends Controller {
    queryParams = ['firstStart'];

    @tracked firstStart = null;
}
