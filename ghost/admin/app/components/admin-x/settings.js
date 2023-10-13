import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import config from 'ghost-admin/config/environment';
import fetchKoenigLexical from 'ghost-admin/utils/fetch-koenig-lexical';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// TODO: Long term move asset management directly in AdminX
const officialThemes = [{
    name: 'Source',
    category: 'News',
    previewUrl: 'https://source.ghost.io/',
    ref: 'default',
    image: 'assets/img/themes/Source.png',
    variants: [
        {
            category: 'Magazine',
            previewUrl: 'https://source-magazine.ghost.io/',
            image: 'assets/img/themes/Source-Magazine.png'
        },
        {
            category: 'Newsletter',
            previewUrl: 'https://source-newsletter.ghost.io/',
            image: 'assets/img/themes/Source-Newsletter.png'
        }
    ]
}, {
    name: 'Casper',
    category: 'Blog',
    previewUrl: 'https://demo.ghost.io/',
    ref: 'TryGhost/Casper',
    image: 'assets/img/themes/Casper.png'
}, {
    name: 'Edition',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Edition',
    previewUrl: 'https://edition.ghost.io/',
    ref: 'TryGhost/Edition',
    image: 'assets/img/themes/Edition.png'
}, {
    name: 'Solo',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Solo',
    previewUrl: 'https://solo.ghost.io',
    ref: 'TryGhost/Solo',
    image: 'assets/img/themes/Solo.png'
}, {
    name: 'Taste',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Taste',
    previewUrl: 'https://taste.ghost.io',
    ref: 'TryGhost/Taste',
    image: 'assets/img/themes/Taste.png'
}, {
    name: 'Episode',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Episode',
    previewUrl: 'https://episode.ghost.io',
    ref: 'TryGhost/Episode',
    image: 'assets/img/themes/Episode.png'
}, {
    name: 'Digest',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Digest',
    previewUrl: 'https://digest.ghost.io/',
    ref: 'TryGhost/Digest',
    image: 'assets/img/themes/Digest.png'
}, {
    name: 'Bulletin',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Bulletin',
    previewUrl: 'https://bulletin.ghost.io/',
    ref: 'TryGhost/Bulletin',
    image: 'assets/img/themes/Bulletin.png'
}, {
    name: 'Alto',
    category: 'Blog',
    url: 'https://github.com/TryGhost/Alto',
    previewUrl: 'https://alto.ghost.io',
    ref: 'TryGhost/Alto',
    image: 'assets/img/themes/Alto.png'
}, {
    name: 'Dope',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Dope',
    previewUrl: 'https://dope.ghost.io',
    ref: 'TryGhost/Dope',
    image: 'assets/img/themes/Dope.png'
}, {
    name: 'Wave',
    category: 'Podcast',
    url: 'https://github.com/TryGhost/Wave',
    previewUrl: 'https://wave.ghost.io',
    ref: 'TryGhost/Wave',
    image: 'assets/img/themes/Wave.png'
}, {
    name: 'Edge',
    category: 'Photography',
    url: 'https://github.com/TryGhost/Edge',
    previewUrl: 'https://edge.ghost.io',
    ref: 'TryGhost/Edge',
    image: 'assets/img/themes/Edge.png'
}, {
    name: 'Dawn',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Dawn',
    previewUrl: 'https://dawn.ghost.io/',
    ref: 'TryGhost/Dawn',
    image: 'assets/img/themes/Dawn.png'
}, {
    name: 'Ease',
    category: 'Documentation',
    url: 'https://github.com/TryGhost/Ease',
    previewUrl: 'https://ease.ghost.io',
    ref: 'TryGhost/Ease',
    image: 'assets/img/themes/Ease.png'
}, {
    name: 'Headline',
    category: 'News',
    url: 'https://github.com/TryGhost/Headline',
    previewUrl: 'https://headline.ghost.io',
    ref: 'TryGhost/Headline',
    image: 'assets/img/themes/Headline.png'
}, {
    name: 'Ruby',
    category: 'Magazine',
    url: 'https://github.com/TryGhost/Ruby',
    previewUrl: 'https://ruby.ghost.io',
    ref: 'TryGhost/Ruby',
    image: 'assets/img/themes/Ruby.png'
}, {
    name: 'London',
    category: 'Photography',
    url: 'https://github.com/TryGhost/London',
    previewUrl: 'https://london.ghost.io',
    ref: 'TryGhost/London',
    image: 'assets/img/themes/London.png'
}, {
    name: 'Journal',
    category: 'Newsletter',
    url: 'https://github.com/TryGhost/Journal',
    previewUrl: 'https://journal.ghost.io/',
    ref: 'TryGhost/Journal',
    image: 'assets/img/themes/Journal.png'
}];

const zapierTemplates = [{
    ghostImage: 'assets/img/logos/orb-black-1.png',
    appImage: 'assets/img/twitter.svg',
    title: 'Share new posts to Twitter',
    url: 'https://zapier.com/webintent/create-zap?template=50909'
}, {
    ghostImage: 'assets/img/logos/orb-black-2.png',
    appImage: 'assets/img/slackicon.png',
    title: 'Share scheduled posts with your team in Slack',
    url: 'https://zapier.com/webintent/create-zap?template=359499'
}, {
    ghostImage: 'assets/img/logos/orb-black-3.png',
    appImage: 'assets/img/patreon.svg',
    title: 'Connect Patreon to your Ghost membership site',
    url: 'https://zapier.com/webintent/create-zap?template=75801'
}, {
    ghostImage: 'assets/img/logos/orb-black-4.png',
    appImage: 'assets/img/zero-bounce.png',
    title: 'Protect email delivery with email verification',
    url: 'https://zapier.com/webintent/create-zap?template=359415'
}, {
    ghostImage: 'assets/img/logos/orb-black-5.png',
    appImage: 'assets/img/paypal.svg',
    title: 'Add members for successful sales in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=184423'
}, {
    ghostImage: 'assets/img/logos/orb-black-3.png',
    appImage: 'assets/img/paypal.svg',
    title: 'Unsubscribe members who cancel a subscription in PayPal',
    url: 'https://zapier.com/webintent/create-zap?template=359348'
}, {
    ghostImage: 'assets/img/logos/orb-black-1.png',
    appImage: 'assets/img/google-docs.svg',
    title: 'Send new post drafts from Google Docs to Ghost',
    url: 'https://zapier.com/webintent/create-zap?template=50924'
}, {
    ghostImage: 'assets/img/logos/orb-black-4.png',
    appImage: 'assets/img/typeform.svg',
    title: 'Survey new members using Typeform',
    url: 'https://zapier.com/webintent/create-zap?template=359407'
}, {
    ghostImage: 'assets/img/logos/orb-black-1.png',
    appImage: 'assets/img/mailchimp.svg',
    title: 'Sync email subscribers in Ghost + Mailchimp',
    url: 'https://zapier.com/webintent/create-zap?template=359342'
}];

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
                <div className="admin-x-settings-container-error">
                    <div className="admin-x-settings-error">
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

export const importSettings = async () => {
    if (window['@tryghost/admin-x-settings']) {
        return window['@tryghost/admin-x-settings'];
    }

    const baseUrl = (config.cdnUrl ? `${config.cdnUrl}assets/` : ghostPaths().assetRootWithHost);
    const url = new URL(`${baseUrl}admin-x-settings/${config.adminXSettingsFilename}?v=${config.adminXSettingsHash}`);

    if (url.protocol === 'http:') {
        window['@tryghost/admin-x-settings'] = await import(`http://${url.host}${url.pathname}${url.search}`);
    } else {
        window['@tryghost/admin-x-settings'] = await import(`https://${url.host}${url.pathname}${url.search}`);
    }

    return window['@tryghost/admin-x-settings'];
};

const fetchSettings = function () {
    let status = 'pending';
    let response;

    const suspender = importSettings().then(
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
    NewslettersResponseType: {type: 'newsletter'},
    RecommendationResponseType: {type: 'recommendation'},
    SettingsResponseType: {type: 'setting', singleton: true},
    ThemesResponseType: {type: 'theme'},
    TiersResponseType: {type: 'tier'},
    UsersResponseType: {type: 'user'},
    CustomThemeSettingsResponseType: {type: 'custom-theme-setting'}
};

export default class AdminXSettings extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;
    @service store;
    @service settings;
    @service router;
    @service membersUtils;
    @service themeManagement;
    @service upgradeStatus;

    @inject config;

    @tracked display = 'none';

    @action
    onError(error) {
        // ensure we're still showing errors in development
        console.error(error); // eslint-disable-line

        if (this.config.sentry_dsn) {
            Sentry.captureException(error, {
                tags: {
                    adminx: true
                }
            });
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
                this.themeManagement.activeTheme = this.store.peekAll('theme').filterBy('name', activated.name).firstObject;
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
        this.router.transitionTo(route, ...models);
    };

    editorResource = fetchSettings();

    AdminXApp = (props) => {
        const {AdminXApp: _AdminXApp} = this.editorResource.read();
        return <_AdminXApp {...props} />;
    };

    ReactComponent = () => {
        const fallback = (
            <div className="admin-x-settings-container--loading" style={{
                width: '100vw',
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
                            ghostVersion={config.APP.version}
                            officialThemes={officialThemes}
                            zapierTemplates={zapierTemplates}
                            externalNavigate={this.externalNavigate}
                            darkMode={this.feature.nightShift}
                            unsplashConfig={defaultUnsplashHeaders}
                            sentry={this.config.sentry_dsn ? Sentry : undefined}
                            fetchKoenigLexical={fetchKoenigLexical}
                            onUpdate={this.onUpdate}
                            onInvalidate={this.onInvalidate}
                            onDelete={this.onDelete}
                            upgradeStatus={this.upgradeStatus}
                        />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
