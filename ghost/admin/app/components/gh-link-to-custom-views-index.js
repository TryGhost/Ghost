import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhCustomViewsIndexLinkComponent extends Component {
    @service customViews;
    @service router;

    _forceReset = false;
    _lastIsActive = false;

    @action
    watchRouterEvents() {
        this.router.on('routeWillChange', this.handleRouteWillChange);
    }

    @action
    unwatchRouterEvents() {
        this.router.off('routeWillChange', this.handleRouteWillChange);
    }

    // the top-level custom nav link will reset the filter if you're currently
    // viewing the associated screen. However, the filter will be remembered by
    // Ember automatically if you leave the screen and come back. This causes
    // odd behaviour in the nav if you were on a custom view, go to another
    // screen, then click back on the top-level nav link as you'll jump from
    // the top-level nav to the custom view.
    //
    // to get around this we keep track of the transitions so that we can force
    // the link to be a "reset" link any time navigation occurs from a custom
    // view to an unassociated screen
    @action
    handleRouteWillChange({from, to}) {
        let normalizedToRoute = to && to.name.replace(/_loading$/, '');

        if (from && from.name === this.args.route && normalizedToRoute !== this.args.route) {
            if (this.customViews.activeView && this.customViews.activeView.route === this.args.route) {
                this._forceReset = true;
            }
        }

        if (normalizedToRoute === this.args.route) {
            this._forceReset = false;
        }
    }

    get isActive() {
        if (this.router.currentRouteName.match(/_loading$/)) {
            return this._lastIsActive;
        }

        let currentRouteName = this.router.currentRouteName.replace(/_loading$/, '');

        // eslint-disable-next-line ghost/ember/no-side-effects
        this._lastIsActive = currentRouteName === this.args.route
            && !this.customViews.activeView;

        return this._lastIsActive;
    }

    get resetQuery() {
        if (this._forceReset || this.router.currentRouteName === this.args.route) {
            return this.args.query;
        }

        return undefined;
    }
}
