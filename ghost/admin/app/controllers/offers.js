import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';

export default class MembersController extends Controller {
    @tracked offersExist = true;
}