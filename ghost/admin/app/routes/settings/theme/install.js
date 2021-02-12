import Route from '@ember/routing/route';

export default class InstallThemeRoute extends Route {
    redirect(model, transition) {
        const {source, ref} = transition.to.queryParams || {};

        if (!source || !ref) {
            this.transitionTo('settings.theme');
        }
    }

    model() {
        return this.store.findAll('theme');
    }
}
