import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class PostsRoute extends AuthenticatedRoute {
    @service stateBridge;
    @service router;
    @service ui;

    // Declared on the route so Ember's generated controller has them without
    // a posts controller. The editor's `<LinkTo @query>` back link needs them
    // declared to carry the list's filters through to React.
    queryParams = {
        type: {refreshModel: true},
        visibility: {refreshModel: true},
        author: {refreshModel: true},
        tag: {refreshModel: true},
        order: {refreshModel: true}
    };

    // React owns /posts and /pages. Aborting keeps Ember from rendering
    // anything for them, and the navigation is handed to React instead.
    // Inherited by PagesRoute, so this covers both URLs.
    beforeModel(transition) {
        super.beforeModel(...arguments);

        transition.abort();

        // Aborting means the route we came FROM never deactivates, so any UI
        // state its teardown would have cleared stays set. The editor's
        // `deactivate` clears full-screen mode, and the React shell reads that
        // to decide whether to show the sidebar - so without this, returning
        // from the editor leaves you looking at a sidebar-less screen.
        this.ui.set('isFullScreen', false);

        // Ember and React share window.location.hash, and an aborted
        // transition never reaches updateURL - so a navigation Ember itself
        // started would be a silent no-op without writing the URL ourselves.
        //
        // The transition intent says which case we're in. A URL intent (cold
        // load, hash change, React-driven navigation) already has the browser
        // URL pointing here, so React renders and there is nothing to do -
        // and leaving it alone is what keeps query params like ?type=draft,
        // which is how saved views are addressed, intact. A named intent
        // (`transitionTo('posts')` from the publish flow, or the editor's
        // `<LinkTo @route="posts">` back link) has no URL yet, so we supply
        // one.
        if (!transition.intent?.url) {
            const url = this._reactRouteUrl(transition);
            this._navigateToReactRoute(url);
            if (transition.from?.name?.startsWith('lexical-editor')) {
                this.stateBridge.trigger('restoreListState', {path: url});
            }
        }

        this._parkOnReactFallback();
    }

    // Aborting stops Ember rendering this screen, but it also leaves the router
    // believing it is still on the route we came from - `currentRouteName` stays
    // `lexical-editor.edit` while the browser is showing the React list. That
    // desync is only invisible until you navigate back to the very same URL:
    // Ember compares it against the route it thinks it is on, finds no
    // difference, and runs no transition at all, so the editor never
    // re-activates and you get an empty screen. Opening a *different* post
    // masks it, because a different id is a real change.
    //
    // So park on `react-fallback` - the empty catch-all Ember already uses for
    // URLs React owns. It makes the router's state honest: the editor
    // deactivates properly, and coming back to it is a real transition again.
    //
    // `replaceWith`, never `transitionTo`: this is a correction to router state
    // the user did not ask for, so it must not add a history entry. The URL is
    // left alone - React owns it, and rewriting it here would drop the query
    // params that address saved views.
    //
    // The guard compares the parked *path*, not just the route name: without
    // it parking loops, and on the name alone it parks only once, pinning the
    // router at whatever the admin booted on - which the editor's back button
    // reads via `transition.from.params.path`.
    _parkOnReactFallback() {
        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;

        if (parkedPath === this.routeName) {
            return;
        }

        // Never write the fallback's queryless URL. On refresh React can read
        // that temporary URL before a silent replaceState restores it, leaving
        // the list and sidebar unfiltered. Suppressing the write also preserves
        // React Router's history state and back/forward index.
        this.router.replaceWith('react-fallback', this.routeName).method(null);
    }

    // Built by hand rather than with `router.urlFor`, whose output depends on
    // the configured location - it returns `/ghost/posts` under the `none`
    // location used in tests but `#/posts/` under `trailing-hash` in the app.
    // These routes have no dynamic segments, so the path is just the name.
    _reactRouteUrl(transition) {
        const queryParams = transition.to?.queryParams ?? {};
        const search = Object.entries(queryParams)
            .filter(([, value]) => value !== null && value !== undefined && value !== '')
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        return search ? `/${this.routeName}?${search}` : `/${this.routeName}`;
    }

    // Seam so tests can assert the navigation without a real hash location -
    // Ember acceptance tests run with `location: 'none'`.
    _navigateToReactRoute(url) {
        window.location.hash = url;
    }
}
