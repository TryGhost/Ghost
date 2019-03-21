import Mixin from '@ember/object/mixin';
import {inject as service} from '@ember/service';

export default Mixin.create({

    ajax: service(),
    ghostPaths: service(),
    session: service(),

    routeIfAlreadyAuthenticated: 'home',

    beforeModel() {
        let authUrl = this.get('ghostPaths.url').api('authentication', 'setup');

        // check the state of the setup process via the API
        return this.ajax.request(authUrl).then((result) => {
            let [setup] = result.setup;

            if (setup.status !== true) {
                this.transitionTo('setup');
            } else {
                // NOTE: this is the same as ESA's UnauthenticatedRouteMixin,
                // adding that mixin to this and calling _super wasn't calling
                // the ESA mixin's beforeModel method
                if (this.session.get('isAuthenticated')) {
                    let routeIfAlreadyAuthenticated = this.routeIfAlreadyAuthenticated;

                    return this.transitionTo(routeIfAlreadyAuthenticated);
                } else {
                    return this._super(...arguments);
                }
            }
        });
    }
});
