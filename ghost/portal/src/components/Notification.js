import Frame from './Frame';
import AppContext from '../AppContext';
import NotificationStyle from './Notification.styles';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';

const React = require('react');

const Styles = ({brandColor, hasText}) => {
    const frame = {
        // ...(!hasText ? {width: '60px'} : {})
    };
    return {
        frame: {
            zIndex: '4000000',
            position: 'fixed',
            top: '0px',
            right: '0',
            left: '0',
            width: '100%',
            height: '80px',
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
            overflow: 'hidden',
            ...frame
        }
    };
};

const NotificationText = ({type, status}) => {
    if (type === 'signin' && status === true) {
        return (
            <p>
                Hey, you are successfully signed in!
            </p>
        );
    } else if (type === 'signin' && status === false) {
        return (
            <p>
                Hey, looks like you used an invalid link to signin!
            </p>
        );
    }
    return (
        <p>
            Hey, this is a neutral notification. I hope you feel well today, here's a <a href='http://ghost.org' target='_blank' rel='noopener noreferrer'>link</a> for you.
        </p>
    );
};

class NotificationContent extends React.Component {
    static contextType = AppContext;

    onNotificationClose() {
        this.context.onAction('closeNotification');
    }

    render() {
        const {notificationType: type, notificationStatus: status} = this.context;
        return (
            <div className='gh-portal-notification-wrapper'>
                <div className={'gh-portal-notification' + (status ? ' success' : ' error')}>
                    <NotificationText type={type} status={status} />
                    <CloseIcon className='gh-portal-notification-closeicon' alt='Close' onClick={e => this.onNotificationClose(e)} />
                </div>
            </div>
        );
    }
}

export default class Notification extends React.Component {
    static contextType = AppContext;

    renderFrameStyles() {
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor}
            }
        ` + NotificationStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    }

    render() {
        const Style = Styles({brandColor: this.context.brandColor});
        const frameStyle = {
            ...Style.frame
        };
        const {showNotification} = this.context;
        if (!showNotification) {
            return null;
        }
        return (
            <Frame style={frameStyle} title="membersjs-notification" head={this.renderFrameStyles()}>
                <NotificationContent updateWidth={width => this.onWidthChange(width)} />
            </Frame>
        );
    }
}