import ShadowRoot from './components/ShadowRoot';
import * as Sentry from '@sentry/react';
import React from 'react';
import ActionHandler from './actions';
import {createPopupNotification,isSentryEventAllowed} from './utils/helpers';
import AppContext from './AppContext';
import {hasMode} from './utils/check-mode';
import setupGhostApi from './utils/api';
import CommentsBox from './components/CommentsBox';

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
            postCommentId: props.postCommentId
        };
    }

    componentDidMount() {
        this.initSetup();
    }

    /** Initialize comments setup on load, fetch data and setup state*/
    async initSetup() {
        try {
            // Fetch data from API, links, preview, dev sources
            const {site, member} = await this.fetchApiData();
            const {comments, pagination} = await this.fetchComments();

            const state = {
                site,
                member,
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
        const data = this.GhostApi.comments.browse({page: 1});

        return {
            comments: data.comments,
            pagination: data.meta.pagination
        };
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
        const {action, popupNotification, customSiteUrl, member, comments, pagination} = this.state;
        return {
            action,
            popupNotification,
            customSiteUrl,
            member,
            comments,
            pagination,
            onAction: (_action, data) => this.dispatchAction(_action, data)
        };
    }

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        clearTimeout(this.timeoutId);
    }

    render() {
        if (this.state.initStatus !== 'success') {
            return null;
        }

        return (
            <SentryErrorBoundary dsn={this.props.sentryDsn}>
                <AppContext.Provider value={this.getContextFromState()}>
                    <ShadowRoot>
                        <CommentsBox />
                    </ShadowRoot>
                </AppContext.Provider>
            </SentryErrorBoundary>
        );
    }
}
