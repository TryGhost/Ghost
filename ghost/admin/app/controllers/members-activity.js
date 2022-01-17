import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';

export default class MembersActivityController extends Controller {
    queryParams = ['filter'];

    @tracked filter = null;
}
