import React from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';

export const PopupNotificationStyles = `
    .gh-portal-popupnotification {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        padding: 8px;
        background: var(--green);
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
        animation: popupnotification-slideout 0.6s ease-in-out;
    }

    .gh-portal-popupnotification p {
        color: var(--white);
        margin: 0;
        padding: 0;
        font-size: 1.4rem;
        letter-spacing: 0.2px;
        text-align: center;
    }

    .gh-portal-popupnotification .closeicon {
        position: absolute;
        top: 1px;
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

    .gh-portal-popupnotification.success {
        background: var(--green);
    }

    .gh-portal-popupnotification.error {
        background: var(--red);
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

const CloseButton = ({hide = false}) => {
    if (hide) {
        return null;
    }
    return (
        <CloseIcon className='closeicon' alt='Close' />
    );
};

const NotificationText = ({type, status}) => {
    if (type === 'updateNewsletter:success') {
        return (
            <p> Newsletter updated! </p>
        );
    } else if (type === 'updateSubscription:success') {
        return (
            <p> Subscription updated! </p>
        );
    } else if (type === 'updateProfile:success') {
        return (
            <p> Profile Updated! </p>
        );
    } else if (type === 'updateProfile:failed') {
        return (
            <p> Failed to update profile! </p>
        );
    }
    const label = status === 'success' ? 'Success' : 'Failed';
    return (
        <p> ${label}</p>
    );
};

export default class PopupNotification extends React.Component {
    static contextType = AppContext;
    constructor() {
        super();
        this.state = {
            className: '',
            notificationType: ''
        };
    }

    onAnimationEnd(e) {
        if (e.animationName === 'popupnotification-slideout') {
            this.context.onAction('clearPopupNotification');
        }
    }

    componentDidUpdate() {
        const {popupNotification} = this.context;
        if (popupNotification.count !== this.state.count) {
            clearTimeout(this.timeoutId);
            this.handlePopupNotification({popupNotification});
        }
    }

    handlePopupNotification({popupNotification}) {
        if (popupNotification.autoHide) {
            const {duration = 2000} = popupNotification;
            this.timeoutId = setTimeout(() => {
                this.setState({
                    className: 'slideout',
                    notificationCount: popupNotification.count
                });
            }, duration);
        } else {
            this.setState({
                notificationCount: popupNotification.count
            });
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
        const {popupNotification} = this.context;
        const {className} = this.state;
        const {type, status, closeable} = popupNotification;
        const statusClass = status ? `  ${status}` : '';
        const slideClass = className ? ` ${className}` : '';

        return (
            <div className={`gh-portal-popupnotification${statusClass}${slideClass}`} onAnimationEnd={e => this.onAnimationEnd(e)}>
                <NotificationText type={type} status={status} />
                <CloseButton hide={!closeable} />
            </div>
        );
    }
}