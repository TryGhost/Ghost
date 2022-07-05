import Form from './components/Form';
import CustomIFrame from './components/CustomIFrame';
import * as Sentry from '@sentry/react';
import React from 'react';
import ActionHandler from './actions';
import {createPopupNotification} from './utils/helpers';
import AppContext from './AppContext';

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
            popupNotification: null,
            customSiteUrl: props.customSiteUrl
        };
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

    /**Get final App level context from App state*/
    getContextFromState() {
        const {action, popupNotification, customSiteUrl} = this.state;
        return {
            action,
            popupNotification,
            customSiteUrl,
            onAction: (_action, data) => this.dispatchAction(_action, data)
        };
    }

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        clearTimeout(this.timeoutId);
    }

    render() {
        return (
            <SentryErrorBoundary dsn={this.props.sentryDsn}>
                <AppContext.Provider value={this.getContextFromState()}>
                    <CustomIFrame>
                        <Form />
                    </CustomIFrame>
                </AppContext.Provider>
            </SentryErrorBoundary>
        );
    }
}
