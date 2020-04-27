import Frame from './Frame';
import {ParentContext} from './ParentContext';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import {ReactComponent as CloseIcon} from '../images/icons/close.svg';
const React = require('react');

const Styles = ({brandColor}) => {
    return {
        frame: {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            boxShadow: 'rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px',
            borderRadius: '50%',
            backgroundColor: brandColor,
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
};

export default class TriggerButton extends React.Component {
    static contextType = ParentContext;

    onToggle() {
        this.context.onAction('togglePopup');
    }

    renderTriggerIcon() {
        const Style = Styles({brandColor: this.context.brandColor});

        if (this.props.isPopupOpen) {
            return (
                <CloseIcon style={Style.closeIcon} />
            );
        }

        return (
            <UserIcon style={Style.userIcon} />
        );
    }

    render() {
        const Style = Styles({brandColor: this.context.brandColor});

        return (
            <Frame style={Style.frame} title="membersjs-trigger">
                <div style={Style.launcher} onClick={e => this.onToggle(e)}>
                    <div style={Style.button}>
                        {this.renderTriggerIcon()}
                    </div>
                </div>
            </Frame>
        );
    }
}
