/* jscs:disable */
import { module } from 'qunit';
import RSVP from 'rsvp';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';

const {Promise} = RSVP;

export default function (name, options = {}) {
    module(name, {
        beforeEach() {
            this.application = startApp();

            if (options.beforeEach) {
                return options.beforeEach(...arguments);
            }
        },

        afterEach() {
            let afterEach = options.afterEach && options.afterEach.apply(this, arguments);
            return Promise.resolve(afterEach).then(() => destroyApp(this.application));
        }
    });
}
