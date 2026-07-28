import Controller from '@ember/controller';

export default class DebugController extends Controller {
    get post() {
        return this.model;
    }
}
