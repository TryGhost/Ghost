import { module } from 'qunit';
import startApp from '../helpers/start-app';
import destroyApp from '../helpers/destroy-app';

export default function (name, options = {}) {
    module(name, {
        beforeEach() {
            this.application = startApp();

            if (options.beforeEach) {
                options.beforeEach.apply(this, arguments);
            }
        },

        afterEach() {
            destroyApp(this.application);

            if (options.afterEach) {
                options.afterEach.apply(this, arguments);
            }
        }
    });
}
