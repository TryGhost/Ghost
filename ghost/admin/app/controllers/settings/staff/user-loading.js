import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class StaffUserLoadingController extends Controller {
    @service session;
}