import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';

export default class InstallThemeController extends Controller {
    queryParams = ['source', 'ref'];

    @tracked source = '';
    @tracked ref = '';
}
