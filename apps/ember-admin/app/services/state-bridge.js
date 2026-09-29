import Evented from '@ember/object/evented';
import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {tracked} from '@glimmer/tracking';

const emberDataTypeMapping = {
    AutomatedEmailsResponseType: null, // automated emails only exist in React admin
    AutomationsResponseType: null, // automations only exist in React admin
    CommentsResponseType: null, // comments only exist in React admin
    GiftLinksResponseType: null, // gift links only exist in React admin
    IntegrationsResponseType: {type: 'integration'},
    InvitesResponseType: {type: 'invite'},
    LabelsResponseType: null, // labels only exist in React admin
    MemberCustomFieldsResponseType: null, // member custom fields only exist in React admin
    MembersResponseType: null, // members only exist in React admin
    OffersResponseType: {type: 'offer'},
    NewslettersResponseType: {type: 'newsletter'},
    RecommendationResponseType: {type: 'recommendation'},
    SettingsResponseType: {type: 'setting', singleton: true},
    SnippetsResponseType: {type: 'snippet'},
    TagsResponseType: {type: 'tag'},
    ThemesResponseType: {type: 'theme'},
    TiersResponseType: {type: 'tier'},
    TiersCheckoutConfigResponseType: null, // tier checkout collection only exists in React admin
    UsersResponseType: {type: 'user'},
    CustomThemeSettingsResponseType: null // invalidated by React theme activation; nothing to sync in Ember
};

export default class StateBridgeService extends Service.extend(Evented) {
    @service billing;
    @service feature;
    @service membersUtils;
    @service search;
    @service session;
    @service settings;
    @service store;
    @service themeManagement;
    @service ui;

    @inject config;

    @tracked postListQueryParams = {posts: {}, pages: {}};

    @action
    setPostListQueryParams(resource, params) {
        this.postListQueryParams = {...this.postListQueryParams, [resource]: params};
    }

    /**
     * Gives React the same synchronous Labs route-ownership decision Ember
     * uses. Both routers must share one authority or they can each defer to
     * the other while state is loading.
     */
    @action
    isFeatureEnabled(name) {
        if (!this.settings.settingsModel) {
            return undefined;
        }

        return this.feature[name] === true;
    }

    @action
    triggerFeatureFlagsChange() {
        this.trigger('featureFlagsChange');
    }

    @action
    refreshFeatureFlagOverrides() {
        this.feature.refreshFeatureFlagOverrides();
        // React route ownership subscribes to this event so it can re-read
        // Ember's invalidated value. It does not write overrides back.
        this.triggerFeatureFlagsChange();
    }

    /* React -> Ember -------------------------------------------------------

    The React admin shell calls these methods any time it updates its own
    data.

    These methods take the React data and push it into the Ember store to
    trigger reactivity, then trigger any other side effects needed to keep
    non-derived state in sync.

    Data types without a model mapping — explicitly null or absent entirely —
    are React-only and no-op; emberDataTypeMapping lists the Ember-relevant
    types.

    */

    @action
    onUpdate(dataType, response) {
        if (!emberDataTypeMapping[dataType]) {
            return;
        }

        const {type, singleton} = emberDataTypeMapping[dataType];

        // Clone the response before pushing to the Ember store because
        // pushPayload mutates the object in place (e.g. renaming keys via
        // serializer attrs). Without cloning, React code holding a reference
        // to the same object would see the mutated property names.
        const clonedResponse = structuredClone(response);

        if (singleton) {
            // Special singleton objects like settings don't work with pushPayload, we need to add the ID explicitly
            this.store.push(this.store.serializerFor(type).normalizeSingleResponse(
                this.store,
                this.store.modelFor(type),
                clonedResponse,
                null,
                'queryRecord'
            ));
        } else {
            this.store.pushPayload(type, clonedResponse);
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
            this.triggerFeatureFlagsChange();
            this.settings.reload()
                .then(() => this.feature.fetch())
                .finally(() => this.triggerFeatureFlagsChange());
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
        if (!emberDataTypeMapping[dataType]) {
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

        if (dataType === 'TagsResponseType') {
            // Ember's tag model expires global search after create/update/delete.
            this.search.expireContent();
        }
    }

    @action
    onDelete(dataType, id) {
        if (!emberDataTypeMapping[dataType]) {
            return;
        }

        const {type} = emberDataTypeMapping[dataType];

        const record = this.store.peekRecord(type, id);

        if (record) {
            record.unloadRecord();
        }
    }

    @action
    preloadAdminThemeStylesheet() {
        return this.feature._loadAdminThemeStylesheet();
    }

    @action
    applyAdminThemePreference(mode) {
        return this.feature._setAdminTheme(mode);
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
        this.trigger('subscriptionChange', data);
    }

    @action
    setSidebarVisible(isVisible) {
        this.trigger('sidebarVisibilityChange', {
            isVisible
        });
    }

    // The gift-link modal lives in React. Ember surfaces (the posts/pages
    // context menu) ask React to open it for a given post/page rather than
    // duplicating the modal — see subscribeOpenGiftLinkModal on the React side.
    @action
    triggerOpenGiftLinkModal({id, resource}) {
        this.trigger('openGiftLinkModal', {id, resource});
    }

    // A billing search result for the billing route already showing is a no-op
    // Ember transition, so React hands the sub-route to the billing app directly
    @action
    navigateToBillingSubRoute(subRoute) {
        this.billing.navigateToSubRoute(subRoute);
    }

    get sidebarVisible() {
        // Sidebar is visible when NOT in fullscreen mode
        return !this.ui.isFullScreen;
    }
}
