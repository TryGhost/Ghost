import Ember from 'ember';
// mixin used for routes to display a loading indicator when there is network activity
var loaderOptions,
    loadingIndicator;

loaderOptions = {
    showSpinner: false
};

NProgress.configure(loaderOptions);

loadingIndicator = Ember.Mixin.create({
    actions:  {

        loading: function () {
            NProgress.start();
            this.router.one('didTransition', function () {
                NProgress.done();
            });

            return true;
        },

        error: function () {
            NProgress.done();

            return true;
        }
    }
});

export default loadingIndicator;
