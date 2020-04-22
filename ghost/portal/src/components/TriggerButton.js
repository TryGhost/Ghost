import Frame from './Frame';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
const React = require('react');
const PropTypes = require('prop-types');

const Styles = {
    frame: {
        zIndex: '2147483000',
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        boxShadow: 'rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px',
        borderRadius: '50%',
        backgroundColor: '#3EB0EF',
        animation: '250ms ease 0s 1 normal none running animation-bhegco',
        transition: 'opacity 0.3s ease 0s'
    },
    launcher: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '60px',
        height: '60px',
        cursor: 'pointer',
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        borderRadius: '50%',
        overflow: 'hidden'
    },
    button: {
        display: 'flex',
        WebkitBoxAlign: 'center',
        alignItems: 'center',
        WebkitBoxPack: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: '0px',
        bottom: '0px',
        width: '100%',
        opacity: '1',
        transform: 'rotate(0deg) scale(1)',
        transition: 'transform 0.16s linear 0s, opacity 0.08s linear 0s'
    },
    userIcon: {
        width: '20px',
        height: '20px',
        color: '#fff'
    },

    closeIcon: {
        width: '20px',
        height: '20px',
        color: '#fff'
    }
};

export default class TriggerButton extends React.Component {
    static propTypes = {
        name: PropTypes.string
    };

    onToggle() {
        this.props.onToggle();
    }

    renderTriggerIcon() {
        if (this.props.isPopupOpen) {
            return (
                <CloseIcon style={Styles.closeIcon} />
            );
        }

        return (
            <UserIcon style={Styles.userIcon} />
        );
    }

    render() {
        const frameStyle = {
            ...Styles.frame,
            backgroundColor: this.props.brandColor || '#3EB0EF'
        };

        return (
            <Frame style={frameStyle} title="membersjs-trigger">
                <div style={Styles.launcher} onClick={e => this.onToggle(e)}>
                    <div style={Styles.button}>
                        {this.renderTriggerIcon()}
                    </div>
                </div>
            </Frame>
        );
    }
}
