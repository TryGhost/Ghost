import PropTypes from 'prop-types';
import Frame from './Frame';
import MemberGravatar from './common/MemberGravatar';
import AppContext from '../AppContext';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import getContrastColor from '../utils/contrast-color';
const React = require('react');

const Styles = ({brandColor, hasText}) => {
    const frame = {
        ...(hasText ? {borderRadius: '12px'} : {}),
        ...(!hasText ? {width: '60px'} : {})
    };
    return {
        frame: {
            zIndex: '2147483000',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '500px',
            maxWidth: '500px',
            height: '60px',
            boxShadow: 'rgba(0, 0, 0, 0.06) 0px 1px 6px 0px, rgba(0, 0, 0, 0.16) 0px 2px 32px 0px',
            borderRadius: '50%',
            backgroundColor: brandColor,
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
            overflow: 'hidden',
            ...frame
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
            userSelect: 'none',
            cursor: 'pointer',
            display: 'flex',
            WebkitBoxAlign: 'center',
            alignItems: 'center',
            WebkitBoxPack: 'center',
            justifyContent: 'center',
            width: '100%',
            opacity: '1',
            transform: 'rotate(0deg) scale(1)',
            height: '100%',
            transition: 'transform 0.16s linear 0s, opacity 0.08s linear 0s',
            overflow: 'hidden'
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

class TriggerButtonContent extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = { };
        this.container = React.createRef();
        this.height = null;
        this.width = null;
    }

    updateHeight(height) {
        this.props.updateHeight && this.props.updateHeight(height);
    }

    updateWidth(width) {
        this.props.updateWidth && this.props.updateWidth(width);
    }

    componentDidMount() {
        if (this.container) {
            this.height = this.container.current && this.container.current.offsetHeight;
            this.width = this.container.current && this.container.current.offsetWidth;
            this.updateHeight(this.height);
            this.updateWidth(this.width);
        }
    }

    componentDidUpdate() {
        if (this.container) {
            const height = this.container.current && this.container.current.offsetHeight;
            let width = this.container.current && this.container.current.offsetWidth;
            if (height !== this.height) {
                this.height = height;
                this.updateHeight(this.height);
            }

            if (width !== this.width) {
                this.width = width;
                this.updateWidth(this.width);
            }
        }
    }

    renderTriggerIcon() {
        const {portal_button_icon: buttonIcon = '', portal_button_style: buttonStyle = ''} = this.context.site || {};
        const Style = Styles({brandColor: this.context.brandColor});
        const memberGravatar = this.context.member && this.context.member.avatar_image;

        if (!buttonStyle.includes('icon')) {
            return null;
        }

        if (memberGravatar) {
            return (
                <MemberGravatar gravatar={memberGravatar} />
            );
        }

        if (buttonIcon) {
            return (
                <img style={{width: '26px', height: '26px'}} src={buttonIcon} alt="Icon" />
            );
        } else {
            return (
                <UserIcon style={Style.userIcon} />
            );
        }
    }

    hasText() {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = this.context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !this.context.member && buttonText;
    }

    renderText() {
        const {
            portal_button_signup_text: buttonText
        } = this.context.site;
        const {brandColor} = this.context;
        const textColor = getContrastColor(brandColor);
        if (this.hasText()) {
            return (
                <span style={{padding: '0 12px', color: textColor}}> {buttonText} </span>
            );
        }
        return null;
    }

    onToggle() {
        this.context.onAction('togglePopup');
    }

    render() {
        const hasText = this.hasText();
        const Style = Styles({brandColor: this.context.brandColor});
        if (hasText) {
            return (
                <div style={Style.button} onClick={e => this.onToggle(e)}>
                    <div style={{padding: '0 24px', display: 'flex'}} ref={this.container}>
                        {this.renderTriggerIcon()}
                        {this.renderText()}
                    </div>
                </div>
            );
        }
        return (
            <div style={Style.button} onClick={e => this.onToggle(e)}>
                <div style={{padding: '0 24px', display: 'flex'}}>
                    {this.renderTriggerIcon()}
                </div>
            </div>
        );
    }
}

export default class TriggerButton extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            width: null
        };
    }

    onWidthChange(width) {
        this.setState({width});
    }

    hasText() {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = this.context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !this.context.member && buttonText;
    }

    render() {
        const hasText = this.hasText();
        const Style = Styles({brandColor: this.context.brandColor, hasText});

        const frameStyle = {
            ...Style.frame
        };
        if (this.state.width) {
            const updatedWidth = this.state.width + 2;
            frameStyle.width = `${updatedWidth}px`;
        }

        return (
            <Frame style={frameStyle} title="membersjs-trigger">
                <TriggerButtonContent isPopupOpen={this.props.isPopupOpen} updateWidth={width => this.onWidthChange(width)} />
            </Frame>
        );
    }
}

TriggerButton.propTypes = {
    isPopupOpen: PropTypes.bool
};
