import Controller from '@ember/controller';
import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {readOnly} from '@ember/object/computed';

@classic
export default class ErrorController extends Controller {
    stack = false;

    @readOnly('model')
        error;

    @computed('error.status')
    get code() {
        return this.get('error.status') > 200 ? this.get('error.status') : 500;
    }

    @computed('error.statusText')
    get message() {
        if (this.code === 404) {
            return 'Page not found';
        }

        return this.get('error.statusText') !== 'error' ? this.get('error.statusText') : 'Internal Server Error';
    }
}
