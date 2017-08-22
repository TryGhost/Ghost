import Mixin from '@ember/object/mixin';
import {inject as injectService} from '@ember/service';

export default Mixin.create({

    ajax: injectService(),
    ghostPaths: injectService(),
    session: injectService(),

    routeIfAlreadyAuthenticated: 'posts',

    beforeModel() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');

        // check the state of the setup process via the API
        return this.get('ajax').request(authUrl).then((result) => {
            let [setup] = result.setup;

            if (setup.status !== true) {
                this.transitionTo('setup');
            } else {
                // NOTE: this is the same as ESA's UnauthenticatedRouteMixin,
                // adding that mixin to this and calling _super wasn't calling
                // the ESA mixin's beforeModel method
                if (this.get('session').get('isAuthenticated')) {
                    let routeIfAlreadyAuthenticated = this.get('routeIfAlreadyAuthenticated');

                    return this.transitionTo(routeIfAlreadyAuthenticated);
                } else {
                    return this._super(...arguments);
                }
            }
        });
    }
});
