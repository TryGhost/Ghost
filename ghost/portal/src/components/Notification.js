import Frame from './Frame';
import AppContext from '../AppContext';
import NotificationStyle from './Notification.styles';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
import NotificationParser, {clearURLParams} from '../utils/notifications';
import {getPortalLink} from '../utils/helpers';

const React = require('react');

const Styles = () => {
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
            overflow: 'hidden'
        }
    };
};

const NotificationText = ({type, status, context}) => {
    const signinPortalLink = getPortalLink({page: 'signin', siteUrl: context.site.url});
    const singupPortalLink = getPortalLink({page: 'signup', siteUrl: context.site.url});
    if (type === 'signin' && status === 'success') {
        return (
            <p>
                Welcome back! You've successfully signed in.
            </p>
        );
    } else if (type === 'signin' && status === 'error') {
        return (
            <p>
                Could not sign in! Login link expired. <a href={signinPortalLink} target="_parent">Click here to retry</a>
            </p>
        );
    } else if (type === 'signup' && status === 'success') {
        return (
            <p>
                You've successfully subscribed to {context.site.title}
            </p>
        );
    } else if (type === 'signup' && status === 'error') {
        return (
            <p>
                Could not sign up! Invalid sign up link. <a href={singupPortalLink} target="_parent">Click here to retry</a>
            </p>
        );
    } else if (type === 'stripe:checkout' && status === 'success') {
        if (context.member) {
            return (
                <p>
                    Success! Your account is fully activated, you now have access to all content.
                </p>
            );
        }
        return (
            <p>
                Success! Check your email for magic link to sign-in.
            </p>
        );
    }
    return (
        <></>
    );
};

class NotificationContent extends React.Component {
    static contextType = AppContext;

    constructor() {
        super();
        this.state = {
            className: ''
        };
    }

    componentWillUnmount() {
        clearTimeout(this.timeoutId);
    }

    onNotificationClose() {
        this.props.onHideNotification();
    }

    componentDidUpdate() {
        const {showPopup} = this.context;
        if (!this.state.className && showPopup) {
            this.setState({
                className: 'slideout'
            });
        }
    }

    componentDidMount() {
        const {autoHide, duration = 2000} = this.props;
        const {showPopup} = this.context;
        if (showPopup) {
            this.setState({
                className: 'slideout'
            });
        } else if (autoHide) {
            this.timeoutId = setTimeout(() => {
                this.setState({
                    className: 'slideout'
                });
            }, duration);
        }
    }

    onAnimationEnd(e) {
        if (e.animationName === 'notification-slideout') {
            this.props.onHideNotification(e);
        }
    }

    render() {
        const {type, status} = this.props;
        const {className = ''} = this.state;
        const statusClass = status ? `  ${status}` : ' neutral';
        const slideClass = className ? ` ${className}` : '';
        return (
            <div className='gh-portal-notification-wrapper'>
                <div className={`gh-portal-notification${statusClass}${slideClass}`} onAnimationEnd={e => this.onAnimationEnd(e)}>
                    <NotificationText type={type} status={status} context={this.context} />
                    <CloseIcon className='gh-portal-notification-closeicon' alt='Close' onClick={e => this.onNotificationClose(e)} />
                </div>
            </div>
        );
    }
}

export default class Notification extends React.Component {
    static contextType = AppContext;

    constructor() {
        super();
        const {type, status, autoHide, duration} = NotificationParser() || {};
        this.state = {
            active: true,
            type,
            status,
            autoHide,
            duration,
            className: ''
        };
    }

    onHideNotification() {
        const type = this.state.type;
        const deleteParams = [];
        if (['signin', 'signup'].includes(type)) {
            deleteParams.push('action', 'success');
        } else if (['stripe:checkout'].includes(type)) {
            deleteParams.push('stripe');
        }
        clearURLParams(deleteParams);
        this.setState({
            active: false
        });
    }

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
        if (!this.state.active) {
            return null;
        }
        const {type, status, autoHide, duration} = this.state;
        if (type && status) {
            return (
                <Frame style={frameStyle} title="membersjs-notification" head={this.renderFrameStyles()}>
                    <NotificationContent {...{type, status, autoHide, duration}} onHideNotification={e => this.onHideNotification(e)} />
                </Frame>
            );
        }
        return null;
    }
}