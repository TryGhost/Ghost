import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import config from 'ghost-admin/config/environment';
import fetchKoenigLexical from 'ghost-admin/utils/fetch-koenig-lexical';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export const defaultUnsplashHeaders = {
    Authorization: `Client-ID 8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980`,
    'Accept-Version': 'v1',
    'Content-Type': 'application/json',
    'App-Pragma': 'no-cache',
    'X-Unsplash-Cache': true
};

class ErrorHandler extends React.Component {
    state = {
        hasError: false
    };

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="admin-x-container-error">
                    <div className="admin-x-error">
                        <h1>Loading interrupted</h1>
                        <p>They say life is a series of trials and tribulations. This moment right here? It's a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                        <a href={ghostPaths().adminRoot}>&larr; Back to the dashboard</a>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export const importComponent = async (packageName) => {
    if (window[packageName]) {
        return window[packageName];
    }

    const relativePath = packageName.replace('@tryghost/', '');
    const configKey = camelize(relativePath);

    if (!config[`${configKey}Filename`] || !config[`${configKey}Hash`]) {
        throw new Error(`Missing config for ${packageName}. Add it in asset delivery.`);
    }

    const baseUrl = (config.cdnUrl ? `${config.cdnUrl}assets/` : ghostPaths().assetRootWithHost);
    let url = new URL(`${baseUrl}${relativePath}/${config[`${configKey}Filename`]}?v=${config[`${configKey}Hash`]}`);

    const customUrl = config[`${configKey}CustomUrl`];
    if (customUrl) {
        url = new URL(customUrl);
    }

    if (url.protocol === 'http:') {
        window[packageName] = await import(`http://${url.host}${url.pathname}${url.search}`);
    } else {
        window[packageName] = await import(`https://${url.host}${url.pathname}${url.search}`);
    }

    return window[packageName];
};

const fetchComponent = function (packageName) {
    if (!packageName) {
        throw new Error('Unknown package name. Make sure you set a static packageName property on your AdminX component class');
    }

    let status = 'pending';
    let response;

    const suspender = importComponent(packageName).then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err) => {
            status = 'error';
            response = err;
        }
    );

    const read = () => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response;
        }
    };

    return {read};
};

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
    CustomThemeSettingsResponseType: {type: 'custom-theme-setting'}
};

// Abstract class which AdminX components should inherit from
export default class AdminXComponent extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;
    @service store;
    @service settings;
    @service router;
    @service membersUtils;
    @service themeManagement;

    @inject config;

    @tracked display = 'none';

    @action
    onError(error) {
        // ensure we're still showing errors in development
        console.error(error); // eslint-disable-line

        if (this.config.sentry_dsn) {
            Sentry.captureException(error);
        }

        // don't rethrow, app should attempt to gracefully recover
    }

    onUpdate = (dataType, response) => {
        if (!emberDataTypeMapping[dataType]) {
            throw new Error(`A mutation updating ${dataType} succeeded in AdminX but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
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

            this.settings.reload();
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
    };

    onInvalidate = (dataType) => {
        if (!emberDataTypeMapping[dataType]) {
            throw new Error(`A mutation invalidating ${dataType} succeeded in AdminX but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
        }

        const {type, singleton} = emberDataTypeMapping[dataType];

        if (singleton) {
            // eslint-disable-next-line no-console
            console.warn(`An AdminX mutation invalidated ${dataType}, but this is is marked as a singleton and cannot be reloaded in Ember. You probably wanted to use updateQueries instead of invalidateQueries`);
            return;
        }

        run(() => this.store.unloadAll(type));

        if (dataType === 'TiersResponseType') {
            // membersUtils has local state which needs to be updated
            this.membersUtils.reload();
        }
    };

    onDelete = (dataType, id) => {
        if (!emberDataTypeMapping[dataType]) {
            throw new Error(`A mutation deleting ${dataType} succeeded in AdminX but there is no mapping to an Ember type. Add one to emberDataTypeMapping`);
        }

        const {type} = emberDataTypeMapping[dataType];

        const record = this.store.peekRecord(type, id);

        if (record) {
            record.unloadRecord();
        }
    };

    externalNavigate = ({route, models = []}) => {
        if (!route.startsWith('/')) {
            route = `/${route}`;
        }
        this.router.transitionTo(route, ...models);
    };

    resource = fetchComponent(this.constructor.packageName);

    AdminXApp = (props) => {
        const {AdminXApp: _AdminXApp} = this.resource.read();
        return <_AdminXApp {...props} />;
    };

    // Can be overridden by subclasses to add additional props to the React app
    additionalProps = () => ({});

    ReactComponent = () => {
        const fallback = (
            <div className="admin-x-settings-container--loading" style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: '8vh'
            }}>
                <video width="100" height="100" loop autoPlay muted playsInline preload="metadata" style={{
                    width: '100px',
                    height: '100px'
                }}>
                    <source src="assets/videos/logo-loader.mp4" type="video/mp4" />
                    <div className="gh-loading-spinner"></div>
                </video>
            </div>
        );
        return (
            <div className={['admin-x-settings-container-', (this.feature.nightShift && 'dark'), this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={fallback}>
                        <this.AdminXApp
                            framework={{
                                ghostVersion: config.APP.version,
                                externalNavigate: this.externalNavigate,
                                unsplashConfig: defaultUnsplashHeaders,
                                sentryDSN: this.config.sentry_dsn ?? null,
                                onUpdate: this.onUpdate,
                                onInvalidate: this.onInvalidate,
                                onDelete: this.onDelete
                            }}
                            designSystem={{
                                fetchKoenigLexical: fetchKoenigLexical,
                                darkMode: this.feature.nightShift
                            }}
                            {...this.additionalProps()}
                        />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
