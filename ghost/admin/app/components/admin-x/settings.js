import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

// TODO: Long term move asset management directly in AdminX
const officialThemes = [{
    name: 'Casper',
    category: 'Blog',
    previewUrl: 'https://demo.ghost.io/',
    ref: 'default',
    image: 'assets/img/themes/Casper.png'
}, {
    name: 'Headline',
    category: 'News',
    url: 'https://github.com/TryGhost/Headline',
    previewUrl: 'https://headline.ghost.io',
    ref: 'TryGhost/Headline',
    image: 'assets/img/themes/Headline.png'
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
                <p className="admin-x-settings-container-error">Loading has failed. Try refreshing the browser!</p>
            );
        }

        return this.props.children;
    }
}

const fetchKoenig = function () {
    let status = 'pending';
    let response;

    const fetchPackage = async () => {
        if (window['@tryghost/admin-x-settings']) {
            return window['@tryghost/admin-x-settings'];
        }

        // the manual specification of the protocol in the import template string is
        // required to work around ember-auto-import complaining about an unknown dynamic import
        // during the build step
        const GhostAdmin = window.GhostAdmin || window.Ember.Namespace.NAMESPACES.find(ns => ns.name === 'ghost-admin');
        const urlTemplate = GhostAdmin.__container__.lookup('config:main').adminX?.url;
        const urlVersion = GhostAdmin.__container__.lookup('config:main').adminX?.version;

        const url = new URL(urlTemplate.replace('{version}', urlVersion));

        if (url.protocol === 'http:') {
            await import(`http://${url.host}${url.pathname}`);
        } else {
            await import(`https://${url.host}${url.pathname}`);
        }

        return window['@tryghost/admin-x-settings'];
    };

    const suspender = fetchPackage().then(
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

const editorResource = fetchKoenig();

const AdminXApp = (props) => {
    const {AdminXApp: _AdminXApp} = editorResource.read();
    return <_AdminXApp {...props} />;
};

export default class AdminXSettings extends Component {
    @service ajax;
    @service feature;
    @service ghostPaths;
    @service session;
    @service store;
    @service settings;

    @inject config;

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

    ReactComponent = () => {
        return (
            <div className={['admin-x-settings-container-', this.args.className].filter(Boolean).join(' ')}>
                <ErrorHandler>
                    <Suspense fallback={<p className="admin-x-settings-container--loading">Loading settings...</p>}>
                        <AdminXApp
                            ghostVersion={config.APP.version}
                            officialThemes={officialThemes}
                        />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
