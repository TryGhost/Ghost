import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark-fill.svg';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import {getSupportAddress} from '../../utils/helpers';
import {clearURLParams} from '../../utils/notifications';
import Interpolate from '@doist/react-interpolate';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';

export const PopupNotificationStyles = `
    .gh-portal-popupnotification {
        right: 42px;
    }

    html[dir="rtl"] .gh-portal-notification {
        right: unset;
        left: 42px;
    }

    @media (max-width: 480px) {
        .gh-portal-notification {
            max-width: calc(100% - 54px);
        }
    }
`;

const CloseButton = ({hide = false, onClose}) => {
    if (hide) {
        return null;
    }
    return (
        <CloseIcon className='gh-portal-notification-closeicon' alt='Close' onClick={onClose} />
    );
};

const NotificationText = ({message, site, t}) => {
    const supportAddress = getSupportAddress({site});
    const supportAddressMail = `mailto:${supportAddress}`;
    if (message) {
        return (
            <p>{message}</p>
        );
    }
    return (
        <p>
            <Interpolate
                syntax={SYNTAX_I18NEXT}
                string={t('An unexpected error occured. Please try again or <a>contact support</a> if the error persists.')}
                mapping={{
                    a: <a href={supportAddressMail} onClick={() => {
                        supportAddressMail && window.open(supportAddressMail);
                    }}/>
                }}
            />
        </p>
    );
};

export default class PopupNotification extends React.Component {
    static contextType = AppContext;
    constructor() {
        super();
        this.state = {
            className: ''
        };
    }

    onAnimationEnd(e) {
        const {popupNotification} = this.context;
        const {type} = popupNotification || {};
        if (e.animationName === 'notification-slideout' || e.animationName === 'notification-slideout-mobile') {
            if (type === 'stripe:billing-update') {
                clearURLParams(['stripe']);
            }
            this.context.onAction('clearPopupNotification');
        }
    }

    closeNotification() {
        this.context.onAction('clearPopupNotification');
    }

    componentDidUpdate() {
        const {popupNotification} = this.context;
        if (popupNotification.count !== this.state.notificationCount) {
            clearTimeout(this.timeoutId);
            this.handlePopupNotification({popupNotification});
        }
    }

    handlePopupNotification({popupNotification}) {
        this.setState({
            notificationCount: popupNotification.count
        });
        if (popupNotification.autoHide) {
            const {duration = 2600} = popupNotification;
            this.timeoutId = setTimeout(() => {
                this.setState((state) => {
                    if (state.className !== 'slideout') {
                        return {
                            className: 'slideout',
                            notificationCount: popupNotification.count
                        };
                    }
                    return {};
                });
            }, duration);
        }
    }

    componentDidMount() {
        const {popupNotification} = this.context;
        this.handlePopupNotification({popupNotification});
    }

    componentWillUnmount() {
        clearTimeout(this.timeoutId);
    }

    render() {
        const {popupNotification, site, t} = this.context;
        const {className} = this.state;
        const {type, status, closeable, message} = popupNotification;
        const statusClass = status ? ` ${status}` : '';
        const slideClass = className ? ` ${className}` : '';

        return (
            <div className={`gh-portal-notification gh-portal-popupnotification ${statusClass}${slideClass}`} onAnimationEnd={e => this.onAnimationEnd(e)}>
                {(status === 'error' ? <WarningIcon className='gh-portal-notification-icon error' alt=''/> : <CheckmarkIcon className='gh-portal-notification-icon success' alt=''/>)}
                <NotificationText type={type} status={status} message={message} site={site} t={t} />
                <CloseButton hide={!closeable} onClose={e => this.closeNotification(e)}/>
            </div>
        );
    }
}
