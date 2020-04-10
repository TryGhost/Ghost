import FrameComponent from './FrameComponent';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
const React = require('react');
const PropTypes = require('prop-types');

export default class TriggerComponent extends React.Component {
    static propTypes = {
        name: PropTypes.string
    };

    onToggle() {
        this.props.onToggle();
    }

    renderTriggerIcon() {
        const userIconStyle = {
            width: '24px',
            height: '24px',
            color: '#fff'
        };

        const closeIconStyle = {
            width: '20px',
            height: '20px',
            color: '#fff'
        };

        if (this.props.isPopupOpen) {
            return (
                <CloseIcon style={closeIconStyle} />
                // <img src={closeIcon} className="trigger-icon" alt="Close" style={{ height: '30px', userSelect: 'none' }} />
            );
        }

        return (
            <UserIcon style={userIconStyle} />
            // <img src={userIcon} className="trigger-icon" alt="Account" style={{ height: '20px', userSelect: 'none' }} />
        );
    }

    render() {
        const backgroundColor = this.props.isPopupOpen ? '#3EB0EF' : '#3EB0EF';
        const hoverStyle = {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            boxShadow: 'rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px',
            borderRadius: '50%',
            backgroundColor: backgroundColor,
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s'
        };

        const launcherStyle = {
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
        };

        const buttonStyle = {
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
        };

        return (
            <FrameComponent style={hoverStyle} title="membersjs-trigger">
                <div style={launcherStyle} onClick={e => this.onToggle(e)} id="membersjs-trigger-component">
                    <div style={buttonStyle}>
                        {this.renderTriggerIcon()}
                    </div>
                </div>
            </FrameComponent>
        );
    }
}
