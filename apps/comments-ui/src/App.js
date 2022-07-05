import ShadowRoot from './components/ShadowRoot';
import * as Sentry from '@sentry/react';
import React from 'react';
import ActionHandler from './actions';
import {createPopupNotification,isSentryEventAllowed} from './utils/helpers';
import AppContext from './AppContext';
import {hasMode} from './utils/check-mode';
import setupGhostApi from './utils/api';
import CommentsBox from './components/CommentsBox';
import {useEffect} from 'react';

function AuthFrame({adminUrl, onLoad}) {
    useEffect(function () {
        onLoad();
    }, []);

    return (
        <iframe data-frame="admin-auth" src={adminUrl + 'auth-frame'}></iframe>
    );
}

function CommentsBoxContainer({done}) {
    if (!done) {
        return null;
    }
    return (
        <ShadowRoot>
            <CommentsBox />
        </ShadowRoot>
    );
}

function SentryErrorBoundary({dsn, children}) {
    if (dsn) {
        return (
            <Sentry.ErrorBoundary>
                {children}
            </Sentry.ErrorBoundary>
        );
    }
    return (
        <>
            {children}
        </>
    );
}

export default class App extends React.Component {
    constructor(props) {
        super(props);

        // Todo: this state is work in progress
        this.state = {
            action: 'init:running',
            initStatus: 'running',
            member: null,
            comments: null,
            pagination: null,
            popupNotification: null,
            customSiteUrl: props.customSiteUrl,
            postId: props.postId
        };
    }

    /** Initialize comments setup on load, fetch data and setup state*/
    async initSetup() {
        try {
            // Fetch data from API, links, preview, dev sources
            const {site, member} = await this.fetchApiData();
            const {comments, pagination} = await this.fetchComments();
            this.adminApi = this.setupAdminAPI();
            const admin = await this.adminApi.getUser();
            /* eslint-disable no-console */
            console.log(admin);
            /* eslint-enable no-console */
            const state = {
                site,
                member,
                admin,
                action: 'init:success',
                initStatus: 'success',
                comments,
                pagination
            };

            this.setState(state);
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Comments] Failed to initialize:`, e);
            /* eslint-enable no-console */
            this.setState({
                action: 'init:failed',
                initStatus: 'failed'
            });
        }
    }

    /** Handle actions from across App and update App state */
    async dispatchAction(action, data) {
        clearTimeout(this.timeoutId);
        this.setState({
            action: `${action}:running`
        });
        try {
            const updatedState = await ActionHandler({action, data, state: this.state, api: this.GhostApi});
            this.setState(updatedState);

            /** Reset action state after short timeout if not failed*/
            if (updatedState && updatedState.action && !updatedState.action.includes(':failed')) {
                this.timeoutId = setTimeout(() => {
                    this.setState({
                        action: ''
                    });
                }, 2000);
            }
        } catch (error) {
            const popupNotification = createPopupNotification({
                type: `${action}:failed`,
                autoHide: true, closeable: true, status: 'error', state: this.state,
                meta: {
                    error
                }
            });
            this.setState({
                action: `${action}:failed`,
                popupNotification
            });
        }
    }

    /** Fetch site and member session data with Ghost Apis  */
    async fetchApiData() {
        const {siteUrl, customSiteUrl, apiUrl, apiKey} = this.props;

        try {
            this.GhostApi = this.props.api || setupGhostApi({siteUrl, apiUrl, apiKey});
            const {site, member} = await this.GhostApi.init();

            this.setupSentry({site});
            return {site, member};
        } catch (e) {
            if (hasMode(['dev', 'test'], {customSiteUrl})) {
                return {};
            }

            throw e;
        }
    }

    /** Fetch first few comments  */
    async fetchComments() {
        const data = await this.GhostApi.comments.browse({page: 1, postId: this.state.postId});

        return {
            comments: data.comments,
            pagination: data.meta.pagination
        };
    }

    setupAdminAPI() {
        const frame = document.querySelector('iframe[data-frame="admin-auth"]');
        let uid = 1;
        let handlers = {};
        window.addEventListener('message', function (event) {
            if (event.origin !== '*') {
                // return;
            }
            let data = null;
            try {
                data = JSON.parse(event.data);
            } catch (err) {
                /* eslint-disable no-console */
                console.error('Error parsing event data', err);
                /* eslint-enable no-console */
                return;
            }

            const handler = handlers[data.uid];

            if (!handler) {
                return;
            }

            delete handlers[data.uid];

            handler(data.error, data.result);
        });

        function callApi(action, args) {
            return new Promise((resolve, reject) => {
                function handler(error, result) {
                    if (error) {
                        return reject(error);
                    }
                    return resolve(result);
                }
                uid += 1;
                handlers[uid] = handler;
                frame.contentWindow.postMessage(JSON.stringify({
                    uid,
                    action,
                    ...args
                }), '*');
            });
        }

        const api = {
            async getUser() {
                const result = await callApi('getUser');
                return result.users[0];
            },
            hideComment(id) {
                return callApi('hideComment', {id});
            },
            showComment(id) {
                return callApi('showComment', {id});
            }
        };

        return api;
    }

    /** Setup Sentry */
    setupSentry({site}) {
        if (hasMode(['test'])) {
            return null;
        }
        const {portal_sentry: portalSentry, portal_version: portalVersion, version: ghostVersion} = site;
        const appVersion = process.env.REACT_APP_VERSION || portalVersion;
        const releaseTag = `comments@${appVersion}|ghost@${ghostVersion}`;
        if (portalSentry && portalSentry.dsn) {
            Sentry.init({
                dsn: portalSentry.dsn,
                environment: portalSentry.env || 'development',
                release: releaseTag,
                beforeSend: (event) => {
                    if (isSentryEventAllowed({event})) {
                        return event;
                    }
                    return null;
                },
                allowUrls: [
                    /https?:\/\/((www)\.)?unpkg\.com\/@tryghost\/comments/
                ]
            });
        }
    }

    /**Get final App level context from App state*/
    getContextFromState() {
        const {action, popupNotification, customSiteUrl, member, comments, pagination, postId} = this.state;
        return {
            action,
            popupNotification,
            customSiteUrl,
            member,
            comments,
            pagination,
            postId,
            onAction: (_action, data) => this.dispatchAction(_action, data)
        };
    }

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        clearTimeout(this.timeoutId);
    }

    render() {
        const done = this.state.initStatus === 'success';

        return (
            <SentryErrorBoundary dsn={this.props.sentryDsn}>
                <AppContext.Provider value={this.getContextFromState()}>
                    <CommentsBoxContainer done={done}/>
                    <AuthFrame adminUrl={this.props.adminUrl} onLoad={this.initSetup.bind(this)}/>
                </AppContext.Provider>
            </SentryErrorBoundary>
        );
    }
}
