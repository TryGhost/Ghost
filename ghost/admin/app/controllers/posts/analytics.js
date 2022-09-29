import Controller from '@ember/controller';

export default class AnalyticsController extends Controller {
    get post() {
        return this.model;
    }
}
