import Ember from 'ember';

export default Ember.Mixin.create({
    actions: {
        error(error, transition) {
            if (error.errors && error.errors[0].errorType === 'NotFoundError') {
                transition.abort();

                let routeInfo = transition.handlerInfos[transition.handlerInfos.length - 1];
                let router = this.get('router');
                let params = [];

                for (const key of Object.keys(routeInfo.params)) {
                    params.push(routeInfo.params[key]);
                }

                return this.transitionTo('error404', router.generate(routeInfo.name, ...params).replace('/ghost/', '').replace(/^\//g, ''));
            }

            return this._super(...arguments);
        }
    }
});
