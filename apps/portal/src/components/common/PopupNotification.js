import {useContext, useEffect, useRef, useState} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as CloseIcon} from '../../images/icons/close.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark-fill.svg';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import {getSupportAddress} from '../../utils/helpers';
import {clearURLParams} from '../../utils/notifications';
import Interpolate from '@doist/react-interpolate';
import {t} from '../../utils/i18n';

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

const NotificationText = ({message, site}) => {
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

export default function PopupNotification() {
    const {popupNotification, site, doAction} = useContext(AppContext);
    const [className, setClassName] = useState('');
    const [notificationCount, setNotificationCount] = useState(null);
    const timeoutIdRef = useRef(null);

    const onAnimationEnd = (e) => {
        const {type} = popupNotification || {};
        if (e.animationName === 'notification-slideout' || e.animationName === 'notification-slideout-mobile') {
            if (type === 'stripe:billing-update') {
                clearURLParams(['stripe']);
            }
            doAction('clearPopupNotification');
        }
    };

    const closeNotification = () => {
        doAction('clearPopupNotification');
    };

    const handlePopupNotification = (notification) => {
        setNotificationCount(notification.count);
        if (notification.autoHide) {
            const {duration = 2600} = notification;
            timeoutIdRef.current = setTimeout(() => {
                setClassName((prevClassName) => {
                    if (prevClassName !== 'slideout') {
                        return 'slideout';
                    }
                    return prevClassName;
                });
            }, duration);
        }
    };

    // Handle initial mount and notification updates
    useEffect(() => {
        if (popupNotification.count !== notificationCount) {
            clearTimeout(timeoutIdRef.current);
            handlePopupNotification(popupNotification);
        }
    }, [popupNotification.count, notificationCount, popupNotification]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            clearTimeout(timeoutIdRef.current);
        };
    }, []);

    const {type, status, closeable, message} = popupNotification;
    const statusClass = status ? ` ${status}` : '';
    const slideClass = className ? ` ${className}` : '';

    return (
        <div className={`gh-portal-notification gh-portal-popupnotification ${statusClass}${slideClass}`} onAnimationEnd={onAnimationEnd}>
            {(status === 'error' ? <WarningIcon className='gh-portal-notification-icon error' alt=''/> : <CheckmarkIcon className='gh-portal-notification-icon success' alt=''/>)}
            <NotificationText type={type} status={status} message={message} site={site} />
            <CloseButton hide={!closeable} onClose={closeNotification}/>
        </div>
    );
}
