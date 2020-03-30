import logo from '../logo.svg';
import closeIcon from '../images/close.png';
const React = require("react");
const PropTypes = require("prop-types");


export default class TriggerComponent extends React.Component {
    static propTypes = {
        name: PropTypes.string,
    };

    onToggle() {
        this.props.onToggle();
    }

    renderTriggerIcon() {
        if (this.props.isPopupOpen) {
            return (
                <img src={closeIcon} alt="logo" style={{ width: '45px', userSelect: 'none' }} />
            )
        }
        return (
            <img src={logo} className="App-logo" alt="logo" style={{ width: '60px', userSelect: 'none' }} />
        )
    }

    render() {
        const hoverStyle = {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            boxShadow: 'rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px',
            borderRadius: '50%',
            backgroundColor: '#e53935',
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
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
            overflow: 'hidden',
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
            transition: 'transform 0.16s linear 0s, opacity 0.08s linear 0s',
        };
        return (
            <div style={hoverStyle} onClick={(e) => this.onToggle(e)}>
                <div style={launcherStyle}>
                    <div style={buttonStyle}>
                        {this.renderTriggerIcon()}
                    </div>
                </div>
            </div>
        );
    }
}