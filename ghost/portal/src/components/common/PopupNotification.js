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
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        padding: 12px;
        background: var(--grey2);
        z-index: 11000;
        border-radius: 5px;
        font-size: 1.5rem;
        box-shadow: 0px 0.8151839971542358px 0.8151839971542358px 0px rgba(var(--blackrgb),0.01),
                    0px 2.2538793087005615px 2.2538793087005615px 0px rgba(var(--blackrgb),0.02),
                    0px 5.426473140716553px 5.426473140716553px 0px rgba(var(--blackrgb),0.03),
                    0px 18px 18px 0px rgba(var(--blackrgb),0.04);
        animation: popupnotification-slidein 0.3s ease-in-out;
    }

    .gh-portal-popupnotification.slideout {
        animation: popupnotification-slideout 0.48s ease-in;
    }

    .gh-portal-popupnotification p {
        color: var(--white);
        margin: 0;
        padding: 0 20px;
        font-size: 1.5rem;
        line-height: 1.5em;
        letter-spacing: 0.2px;
        text-align: center;
    }

    .gh-portal-popupnotification a {
        color: var(--white);
    }

    .gh-portal-popupnotification-icon {
        position: absolute;
        top: 12px;
        left: 12px;
        width: 20px;
        height: 20px;
    }

    .gh-portal-popupnotification-icon.success {
        color: var(--green);
    }

    .gh-portal-popupnotification-icon.error {
        color: var(--red);
    }

    .gh-portal-popupnotification .closeicon {
        position: absolute;
        top: 3px;
        bottom: 0;
        right: 3px;
        color: var(--white);
        cursor: pointer;
        width: 16px;
        height: 16px;
        padding: 12px;
        transition: all 0.15s ease-in-out forwards;
        opacity: 0.8;
    }

    .gh-portal-popupnotification .closeicon:hover {
        opacity: 1.0;
    }

    @keyframes popupnotification-slidein {
        0% {
            transform: translateY(-10px);
            opacity: 0;
        }
        60% { transform: translateY(2px); }
        100% {
            transform: translateY(0);
            opacity: 1.0;
        }
    }

    @keyframes popupnotification-slideout {
        0% {
            transform: translateY(0);
            opacity: 1.0;
        }
        40% { transform: translateY(2px); }
        100% {
            transform: translateY(-10px);
            opacity: 0;
        }
    }
`;

const CloseButton = ({hide = false, onClose}) => {
    if (hide) {
        return null;
    }
    return (
        <CloseIcon className='closeicon' alt='Close' onClick={onClose} />
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
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
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
        if (e.animationName === 'popupnotification-slideout') {
            if (type === 'stripe:billing-update') {
                clearURLParams(['stripe']);
            }
            this.context.onAction('clearPopupNotification');
        }
    }

    closeNotification(e) {
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
            <div className={`gh-portal-popupnotification${statusClass}${slideClass}`} onAnimationEnd={e => this.onAnimationEnd(e)}>
                {(status === 'error' ? <WarningIcon className='gh-portal-popupnotification-icon error' alt=''/> : <CheckmarkIcon className='gh-portal-popupnotification-icon success' alt=''/>)}
                <NotificationText type={type} status={status} message={message} site={site} t={t} />
                <CloseButton hide={!closeable} onClose={e => this.closeNotification(e)}/>
            </div>
        );
    }
}
