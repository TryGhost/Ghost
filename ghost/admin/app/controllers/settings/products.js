import Controller from '@ember/controller';

export default class ProductsController extends Controller {
    get products() {
        return this.model.sortBy('name');
    }
}
