import * as Sentry from '@sentry/ember';
import Component from '@glimmer/component';
import React, {Suspense} from 'react';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

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
                        />
                    </Suspense>
                </ErrorHandler>
            </div>
        );
    };
}
