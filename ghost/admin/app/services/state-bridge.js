import Evented from '@ember/object/evented';
import Service, {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';

const emberDataTypeMapping = {
    IntegrationsResponseType: {type: 'integration'},
    InvitesResponseType: {type: 'invite'},
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
    @service feature;
    @service membersUtils;
    @service session;
    @service settings;
    @service store;
    @service themeManagement;

    @inject config;

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
}
