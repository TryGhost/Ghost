import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark-fill.svg';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import {getSupportAddress} from '../../utils/helpers';
import {clearURLParams} from '../../utils/notifications';

export const PopupNotificationStyles = `
    .gh-portal-popupnotification {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        padding: 8px;
        background: var(--grey2);
        z-index: 9999;
        border-radius: 4px;
        font-size: 1.3rem;
        box-shadow: 0px 0.8151839971542358px 0.8151839971542358px 0px rgba(0,0,0,0.01),
                    0px 2.2538793087005615px 2.2538793087005615px 0px rgba(0,0,0,0.02),
                    0px 5.426473140716553px 5.426473140716553px 0px rgba(0,0,0,0.03),
                    0px 18px 18px 0px rgba(0,0,0,0.04);
        animation: popupnotification-slidein 0.6s ease-in-out;
    }

    .gh-portal-popupnotification.slideout {
        animation: popupnotification-slideout 0.48s ease-in;
    }

    .gh-portal-popupnotification p {
        color: var(--white);
        margin: 0;
        padding: 0 20px;
        font-size: 1.4rem;
        line-height: 1.5em;
        letter-spacing: 0.2px;
        text-align: center;
    }

    .gh-portal-popupnotification a {
        color: var(--white);
    }

    .gh-portal-popupnotification-icon {
        position: absolute;
        top: 10px;
        left: 10px;
        width: 16px;
        height: 16px;
    }

    .gh-portal-popupnotification-icon.success {
        color: var(--green);
    }

    .gh-portal-popupnotification-icon.error {
        color: #FF2828;
    }

    .gh-portal-popupnotification .closeicon {
        position: absolute;
        top: 0px;
        bottom: 0;
        right: 0;
        color: var(--white);
        cursor: pointer;
        width: 12px;
        height: 12px;
        padding: 12px;
        transition: all 0.2s ease-in-out forwards;
        opacity: 0.8;
    }

    .gh-portal-popupnotification .closeicon:hover {
        opacity: 1.0;
    }

    @keyframes popupnotification-slidein {
        0% { transform: translateY(-100px); }
        60% { transform: translateY(8px); }
        100% { transform: translateY(0); }
    }

    @keyframes popupnotification-slideout {
        0% { transform: translateY(0); }
        40% { transform: translateY(8px); }
        100% { transform: translateY(-100px); }
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

const NotificationText = ({message, site}) => {
    const supportAddress = getSupportAddress({site});
    const supportAddressMail = `mailto:${supportAddress}`;
    if (message) {
        return (
            <p>{message}</p>
        );
    }
    return (
        <p> An unexpected error occured. Please try again or <a href={supportAddressMail} onClick={() => {
            supportAddressMail && window.open(supportAddressMail);
        }}>contact support</a> if the error persists.</p>
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
        const {popupNotification, site} = this.context;
        const {className} = this.state;
        const {type, status, closeable, message} = popupNotification;
        const statusClass = status ? ` ${status}` : '';
        const slideClass = className ? ` ${className}` : '';

        return (
            <div className={`gh-portal-popupnotification${statusClass}${slideClass}`} onAnimationEnd={e => this.onAnimationEnd(e)}>
                {(status === 'error' ? <WarningIcon className='gh-portal-popupnotification-icon error' alt=''/> : <CheckmarkIcon className='gh-portal-popupnotification-icon success' alt=''/>)}
                <NotificationText type={type} status={status} message={message} site={site} />
                <CloseButton hide={!closeable} onClose={e => this.closeNotification(e)}/>
            </div>
        );
    }
}