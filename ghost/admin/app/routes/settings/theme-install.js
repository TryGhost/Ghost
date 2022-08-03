import Route from '@ember/routing/route';

export default class InstallThemeRoute extends Route {
    redirect(model, transition) {
        this.transitionTo('settings.design.change-theme.install', {queryParams: transition.to.queryParams});
    }
}
