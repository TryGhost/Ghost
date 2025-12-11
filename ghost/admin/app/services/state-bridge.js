import Evented from '@ember/object/evented';
import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {getOwner} from '@ember/application';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';

const emberDataTypeMapping = {
    AutomatedEmailsResponseType: null, // automated emails only exist in React admin
    CommentsResponseType: null, // comments moderation only exists in React admin
    IntegrationsResponseType: {type: 'integration'},
    InvitesResponseType: {type: 'invite'},
    MembersResponseType: {type: 'member'},
    OffersResponseType: {type: 'offer'},
    NewslettersResponseType: {type: 'newsletter'},
    RecommendationResponseType: {type: 'recommendation'},
    SettingsResponseType: {type: 'setting', singleton: true},
    ThemesResponseType: {type: 'theme'},
    TiersResponseType: {type: 'tier'},
    UsersResponseType: {type: 'user'},
    CustomThemeSettingsResponseType: null // custom theme settings no longer exist in Admin
};

export default class StateBridgeService extends Service.extend(Evented) {
    @service customViews;
    @service feature;
    @service membersUtils;
    @service router;
    @service session;
    @service settings;
    @service store;
    @service themeManagement;
    @service ui;

    @inject config;

    constructor() {
        super(...arguments);
        this.router.on('routeDidChange', this, this.handleRouteDidChange);
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.router.off('routeDidChange', this, this.handleRouteDidChange);
    }

    @action
    handleRouteDidChange() {
        const currentRoute = this.router.currentRoute;
        this.trigger('routeChange', {
            routeName: this.router.currentRouteName,
            queryParams: currentRoute?.queryParams || {}
        });
    }

    /* React -> Ember -------------------------------------------------------

    The React admin shell app or a component that extends AdminXComponent will
    call these methods any time they update their own data.

    These methods take the React data and push it into the Ember store to
    trigger reactivity, then trigger any other side effects needed to keep
    non-derived state in sync.

    */

    @action
    onUpdate(dataType, response) {
        if (!(dataType in emberDataTypeMapping)) {
            throw new Error(`A mutation updating ${dataType} succeeded in React Admin but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
        }

        // Skip processing if mapping is explicitly set to null
        if (emberDataTypeMapping[dataType] === null) {
            return;
        }

        const {type, singleton} = emberDataTypeMapping[dataType];

        if (singleton) {
            // Special singleton objects like settings don't work with pushPayload, we need to add the ID explicitly
            this.store.push(this.store.serializerFor(type).normalizeSingleResponse(
                this.store,
                this.store.modelFor(type),
                response,
                null,
                'queryRecord'
            ));
        } else {
            this.store.pushPayload(type, response);
        }

        if (dataType === 'UsersResponseType' && response.users[0]?.id === this.session.user?.id) {
            // nightShift preference is managed by the feature service and won't auto-update when store data changes
            try {
                this.feature._setAdminTheme();
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('Failed to set admin theme', error);
            }
        }

        if (dataType === 'SettingsResponseType') {
            // Blog title is based on settings, but the one stored in config is used instead in various places
            this.config.blogTitle = response.settings.find(setting => setting.key === 'title').value;

            // TODO: Reloading settings does not trigger a re-fetch of the
            // feature flags. We should maybe find a better way to do this.
            this.settings.reload().then(() => {
                this.feature.fetch();
            });
        }

        if (dataType === 'TiersResponseType') {
            // membersUtils has local state which needs to be updated
            this.membersUtils.reload();
        }

        if (dataType === 'ThemesResponseType') {
            const activated = response.themes.find(theme => theme.active);

            if (activated) {
                const previouslyActive = this.store.peekAll('theme').find(theme => theme.active && theme.name !== activated.name);
                previouslyActive?.set('active', false);

                const newlyActive = this.store.peekAll('theme').filterBy('name', activated.name).firstObject;
                newlyActive?.set('active', true);
                this.themeManagement.activeTheme = newlyActive;
            }
        }
    }

    @action
    onInvalidate(dataType) {
        if (!(dataType in emberDataTypeMapping)) {
            throw new Error(`A mutation invalidating ${dataType} succeeded in React Admin but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
        }

        // Skip processing if mapping is explicitly set to null
        if (emberDataTypeMapping[dataType] === null) {
            return;
        }

        const {type, singleton} = emberDataTypeMapping[dataType];

        if (singleton) {
            // eslint-disable-next-line no-console
            console.warn(`An React Admin mutation invalidated ${dataType}, but this is is marked as a singleton and cannot be reloaded in Ember. You probably wanted to use updateQueries instead of invalidateQueries`);
            return;
        }

        run(() => this.store.unloadAll(type));

        if (dataType === 'TiersResponseType') {
            // membersUtils has local state which needs to be updated
            this.membersUtils.reload();
        }
    }

    @action
    onDelete(dataType, id) {
        if (!(dataType in emberDataTypeMapping)) {
            throw new Error(`A mutation deleting ${dataType} succeeded in React Admin but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
        }

        // Skip processing if mapping is explicitly set to null
        if (emberDataTypeMapping[dataType] === null) {
            return;
        }

        const {type} = emberDataTypeMapping[dataType];

        const record = this.store.peekRecord(type, id);

        if (record) {
            record.unloadRecord();
        }
    }

    /* Ember -> React -------------------------------------------------------

    When Ember Data store records are updated, created, or deleted via the
    adapter (after successful API calls), we notify React to invalidate/update
    its TanStack Query cache.

    */

    @action
    triggerEmberDataChange(operation, modelName, id, response) {
        this.trigger('emberDataChange', {
            operation, // 'update' | 'create' | 'delete'
            modelName, // e.g., 'post', 'user', 'setting'
            id,
            data: response // API response data for optimistic updates
        });
    }

    @action
    triggerEmberAuthChange() {
        this.trigger('emberAuthChange', {
            isAuthenticated: this.session.isAuthenticated
        });
    }

    @action
    triggerSubscriptionChange(data) {
        this.trigger('subscriptionChange', {
            ...data
        });
    }

    @action
    setSidebarVisible(isVisible) {
        this.trigger('sidebarVisibilityChange', {
            isVisible
        });
    }

    get sidebarVisible() {
        // Sidebar is visible when NOT in fullscreen mode
        return !this.ui.isFullScreen;
    }

    /* Routing utilities for React admin shell */

    @action
    getRouteUrl(routeName, queryParamsOverride) {
        if (!routeName) {
            return '';
        }

        // Normalize route names to ignore loading states
        const currentRouteName = this.router.currentRouteName?.replace(/_loading$/, '') || '';
        const isOnSameRoute = currentRouteName === routeName || currentRouteName.startsWith(routeName + '.');
        
        // When generating the URL for the current route (or a parent thereof)
        // we want to clear the default query param state. This allows the
        // iOS-like "click one more time to go back home" behavior.
        if (isOnSameRoute && !queryParamsOverride) {
            return this.router.urlFor(routeName, {queryParams: {}});
        }

        // Use query params override if provided, otherwise get the current
        // state from the controller. This is what enables "sticky filters". 
        const params = queryParamsOverride || this._getControllerQueryParams(routeName);
        
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== '')
        );
        
        // When the controller query params (i.e. sticky filters) match one of
        // the custom views, we want to exclude them from the url for the base
        // route. Otherwise, clicking on the "Posts" menu item would redirect
        // you to the custom view you had open most recently. 
        const hasCleanParams = Object.keys(cleanParams).length > 0;
        if (!queryParamsOverride && hasCleanParams) {
            if (this.customViews.findView(routeName, cleanParams)) {
                return this.router.urlFor(routeName, {queryParams: {}});
            }
        }

        return this.router.urlFor(routeName, {queryParams: cleanParams});
    }

    @action
    isRouteActive(routeNames, queryParams) {
        let currentRouteName = this.router.currentRouteName?.replace(/_loading$/, '') || '';
        
        // Normalize routeNames to an array
        const routes = Array.isArray(routeNames) ? routeNames : routeNames.split(' ');
        
        // Check if current route matches any of the specified routes
        const routeMatches = routes.some((route) => {
            // Support both exact matches and subpath matches (e.g., "members"
            // matches "members.index")
            return currentRouteName === route || currentRouteName.startsWith(route + '.');
        });
        
        if (!routeMatches) {
            return false;
        }

        const isMainLink = !queryParams;
        const activeView = this.customViews.activeView;

        // If we're checking the main link and there is no active custom view,
        // then we consider the main link to be active, regardless of if there
        // are query params in the current url.
        if (isMainLink) {
            return !activeView;
        }

        // If we're not checking the main link, then this is a custom view. If
        // there's no active view, this custom view link can't be active
        if (!activeView) {
            return false;
        }

        // If we've reached this far, we're currently on an active custom view
        // and the route matches, so we need to compare the query params.
        const cleanedFilter = this.customViews.cleanFilter(activeView.filter);
        return this.customViews.isFilterEqual(cleanedFilter, queryParams);
    }

    _getControllerQueryParams(routeName) {
        const owner = getOwner(this);
        const controller = owner.lookup(`controller:${routeName}`);
        
        if (!controller || !controller.queryParams) {
            return {};
        }

        const params = {};
        for (let param of controller.queryParams) {
            let controllerKey, urlKey;
            
            if (typeof param === 'string') {
                // Simple param: key is the same in controller and URL
                controllerKey = param;
                urlKey = param;
            } else {
                // Mapped param: {controllerKey: 'urlKey'}
                controllerKey = Object.keys(param)[0];
                urlKey = param[controllerKey];
            }
            
            const value = controller[controllerKey];
            if (value !== null && value !== undefined) {
                params[urlKey] = value;
            }
        }

        return params;
    }
}
