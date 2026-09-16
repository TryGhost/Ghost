import Controller from '@ember/controller';

export default class BillingController extends Controller {
    queryParams = ['action'];
    action = null;

    get guid() {
        return this.model;
    }
}
