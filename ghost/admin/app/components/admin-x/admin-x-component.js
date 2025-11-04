import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import config from 'ghost-admin/config/environment';
import fetch from 'fetch';
import fetchKoenigLexical from 'ghost-admin/utils/fetch-koenig-lexical';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {camelize} from '@ember/string';
import {inject} from 'ghost-admin/decorators/inject';
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

    const remoteConfigUrl = config[`${configKey}RemoteConfigUrl`];
    if (remoteConfigUrl) {
        try {
            const remoteConfig = await fetch(remoteConfigUrl, window.location);
            const remoteConfigJson = await remoteConfig.json();
            const client = remoteConfigJson.client;
            if (client && client.cdnUrl) {
                url = new URL(client.cdnUrl);
            }
        } catch (error) {
            // Fallback to previous behaviour
        }
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
    @service stateBridge;

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
                    <source src={this.feature.nightShift ? 'assets/videos/logo-loader-dark.mp4' : 'assets/videos/logo-loader.mp4'} type="video/mp4" />
                    <div className="gh-loading-spinner"></div>
                </video>
            </div>
        );
        return (
            <div className={['admin-x-settings-container-', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={fallback}>
                        <this.AdminXApp
                            framework={{
                                ghostVersion: this.feature.inAdminForward ? '' : config.APP.version,
                                externalNavigate: this.externalNavigate,
                                unsplashConfig: defaultUnsplashHeaders,
                                sentryDSN: this.config.sentry_dsn ?? null,
                                onUpdate: this.stateBridge.onUpdate,
                                onInvalidate: this.stateBridge.onInvalidate,
                                onDelete: this.stateBridge.onDelete
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
