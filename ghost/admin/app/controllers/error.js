import Controller from '@ember/controller';

export default class ErrorController extends Controller {
    stack = false;

    get error() {
        return this.model;
    }

    get code() {
        return this.error.status > 200 ? this.error.status : 500;
    }

    get message() {
        if (this.code === 404) {
            return 'Page not found';
        }

        return this.error.statusText !== 'error' ? this.error.statusText : 'Internal Server Error';
    }
}
