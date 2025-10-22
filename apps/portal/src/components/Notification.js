import {useContext, useEffect, useState, useRef} from 'react';
import Frame from './Frame';
import AppContext from '../AppContext';
import NotificationStyle from './Notification.styles';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
import {ReactComponent as CheckmarkIcon} from '../images/icons/checkmark-fill.svg';
import {ReactComponent as WarningIcon} from '../images/icons/warning-fill.svg';
import NotificationParser, {clearURLParams} from '../utils/notifications';
import {getPortalLink} from '../utils/helpers';
import {t} from '../utils/i18n';

const Styles = () => {
    return {
        frame: {
            zIndex: '4000000',
            position: 'fixed',
            top: '0',
            right: '0',
            maxWidth: '481px',
            width: '100%',
            height: '220px',
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
            overflow: 'hidden'
        }
    };
};

const NotificationText = ({type, status, context}) => {
    const signinPortalLink = getPortalLink({page: 'signin', siteUrl: context.site.url});
    const singupPortalLink = getPortalLink({page: 'signup', siteUrl: context.site.url});

    if (type === 'signin' && status === 'success' && context.member) {
        const firstname = context.member.firstname || '';
        return (
            <p>
                <strong>{firstname ? t('Welcome back, {name}!', {name: firstname}) : t('Welcome back!')}</strong><br />{t('You\'ve successfully signed in.')}
            </p>
        );
    } else if (type === 'signin' && status === 'error') {
        return (
            <p>
                {t('Could not sign in. Login link expired.')} <br /><a href={signinPortalLink} target="_parent">{t('Click here to retry')}</a>
            </p>
        );
    } else if (type === 'signup' && status === 'success') {
        return (
            <p>
                {t('You\'ve successfully subscribed to')} <br /><strong>{context.site.title}</strong>
            </p>
        );
    } else if (type === 'signup-paid' && status === 'success') {
        return (
            <p>
                {t('You\'ve successfully subscribed to')} <br /><strong>{context.site.title}</strong>
            </p>
        );
    } else if (type === 'updateEmail' && status === 'success') {
        return (
            <p>
                {t('Success! Your email is updated.')}
            </p>
        );
    } else if (type === 'updateEmail' && status === 'error') {
        return (
            <p>
                {t('Could not update email! Invalid link.')}
            </p>
        );
    } else if (type === 'signup' && status === 'error') {
        return (
            <p>
                {t('Signup error: Invalid link')}<br /><a href={singupPortalLink} target="_parent">{t('Click here to retry')}</a>
            </p>
        );
    } else if (type === 'signup-paid' && status === 'error') {
        return (
            <p>
                {t('Signup error: Invalid link')}<br /><a href={singupPortalLink} target="_parent">{t('Click here to retry')}</a>
            </p>
        );
    } else if (type === 'stripe:checkout' && status === 'success') {
        if (context.member) {
            return (
                <p>
                    {t('Success! Your account is fully activated, you now have access to all content.')}
                </p>
            );
        }
        return (
            <p>
                {t('Success! Check your email for magic link to sign-in.')}
            </p>
        );
    } else if (type === 'stripe:checkout' && status === 'warning') {
        // Stripe checkout flow was cancelled
        if (context.member) {
            return (
                <p>
                    {t('Plan upgrade was cancelled.')}
                </p>
            );
        }
        return (
            <p>
                {t('Plan checkout was cancelled.')}
            </p>
        );
    } else if (type === 'support' && status === 'success') {
        return (
            <p>
                {t('Thank you for your support!')}
            </p>
        );
    }
    return (
        <p>
            {status === 'success' ? t('Success') : t('Error')}
        </p>
    );
};

function NotificationContent({type, status, autoHide, duration = 2400, onHideNotification}) {
    const context = useContext(AppContext);
    const [className, setClassName] = useState('');
    const timeoutIdRef = useRef(null);

    useEffect(() => {
        return () => {
            clearTimeout(timeoutIdRef.current);
        };
    }, []);

    useEffect(() => {
        const {showPopup} = context;
        if (showPopup) {
            setClassName('slideout');
        } else if (autoHide) {
            timeoutIdRef.current = setTimeout(() => {
                setClassName('slideout');
            }, duration);
        }
    }, [context, autoHide, duration]);

    useEffect(() => {
        const {showPopup} = context;
        if (!className && showPopup) {
            setClassName('slideout');
        }
    }, [context, className]);

    const onNotificationClose = () => {
        onHideNotification();
    };

    const onAnimationEnd = (e) => {
        if (e.animationName === 'notification-slideout' || e.animationName === 'notification-slideout-mobile') {
            onHideNotification(e);
        }
    };

    const statusClass = status ? `  ${status}` : ' neutral';
    const slideClass = className ? ` ${className}` : '';

    return (
        <div className='gh-portal-notification-wrapper'>
            <div className={`gh-portal-notification${statusClass}${slideClass}`} onAnimationEnd={onAnimationEnd}>
                {(status === 'error' ? <WarningIcon className='gh-portal-notification-icon error' alt=''/> : <CheckmarkIcon className='gh-portal-notification-icon success' alt=''/>)}
                <NotificationText type={type} status={status} context={context} />
                <CloseIcon className='gh-portal-notification-closeicon' alt='Close' onClick={onNotificationClose} />
            </div>
        </div>
    );
}

export default function Notification() {
    const context = useContext(AppContext);
    const notificationData = NotificationParser() || {};
    const [active, setActive] = useState(true);
    const [type] = useState(notificationData.type);
    const [status] = useState(notificationData.status);
    const [autoHide] = useState(notificationData.autoHide);
    const [duration] = useState(notificationData.duration);

    useEffect(() => {
        const {showPopup} = context;
        if (showPopup) {
            // Don't show a notification if there is a popup visible on page load
            setActive(false);
        }
    }, [context]);

    const onHideNotification = () => {
        const deleteParams = [];
        if (['signin', 'signup'].includes(type)) {
            deleteParams.push('action', 'success');
        } else if (['stripe:checkout'].includes(type)) {
            deleteParams.push('stripe');
        }
        clearURLParams(deleteParams);
        context.doAction('refreshMemberData');
        setActive(false);
    };

    const renderFrameStyles = () => {
        const styles = `
            :root {
                --brandcolor: ${context.brandColor}
            }
        ` + NotificationStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    };

    const Style = Styles({brandColor: context.brandColor});
    const frameStyle = {
        ...Style.frame
    };

    if (!active) {
        return null;
    }

    if (type && status) {
        return (
            <Frame style={frameStyle} title="portal-notification" head={renderFrameStyles()} className='gh-portal-notification-iframe' data-testid="portal-notification-frame" >
                <NotificationContent {...{type, status, autoHide, duration}} onHideNotification={onHideNotification} />
            </Frame>
        );
    }

    return null;
}
