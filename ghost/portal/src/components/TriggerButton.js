import React from 'react';
import Frame from './Frame';
import MemberGravatar from './common/MemberGravatar';
import AppContext from '../AppContext';
import {ReactComponent as UserIcon} from '../images/icons/user.svg';
import {ReactComponent as ButtonIcon1} from '../images/icons/button-icon-1.svg';
import {ReactComponent as ButtonIcon2} from '../images/icons/button-icon-2.svg';
import {ReactComponent as ButtonIcon3} from '../images/icons/button-icon-3.svg';
import {ReactComponent as ButtonIcon4} from '../images/icons/button-icon-4.svg';
import {ReactComponent as ButtonIcon5} from '../images/icons/button-icon-5.svg';
import TriggerButtonStyle from './TriggerButton.styles';
import {isInviteOnlySite} from '../utils/helpers';
import {hasMode} from '../utils/check-mode';

const ICON_MAPPING = {
    'icon-1': ButtonIcon1,
    'icon-2': ButtonIcon2,
    'icon-3': ButtonIcon3,
    'icon-4': ButtonIcon4,
    'icon-5': ButtonIcon5
};

const Styles = ({brandColor, hasText}) => {
    const frame = {
        ...(!hasText ? {width: '105px'} : {}),
        ...(hasMode(['preview']) ? {opacity: 1} : {})
    };
    return {
        frame: {
            zIndex: '3999998',
            position: 'fixed',
            bottom: '0',
            right: '0',
            width: '500px',
            maxWidth: '500px',
            height: '98px',
            animation: '250ms ease 0s 1 normal none running animation-bhegco',
            transition: 'opacity 0.3s ease 0s',
            overflow: 'hidden',
            ...frame
        },
        userIcon: {
            width: '34px',
            height: '34px',
            color: '#fff'
        },
        buttonIcon: {
            width: '24px',
            height: '24px',
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

        if (!buttonStyle.includes('icon') && !this.context.member) {
            return null;
        }

        if (memberGravatar) {
            return (
                <MemberGravatar gravatar={memberGravatar} />
            );
        }

        if (this.context.member) {
            return (
                <UserIcon style={Style.userIcon} />
            );
        } else {
            if (Object.keys(ICON_MAPPING).includes(buttonIcon)) {
                const ButtonIcon = ICON_MAPPING[buttonIcon];
                return (
                    <ButtonIcon style={Style.buttonIcon} />
                );
            } else if (buttonIcon) {
                return (
                    <img style={{width: '26px', height: '26px'}} src={buttonIcon} alt="" />
                );
            } else {
                if (this.hasText()) {
                    Style.userIcon.width = '26px';
                    Style.userIcon.height = '26px';
                }
                return (
                    <UserIcon style={Style.userIcon} />
                );
            }
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
        if (this.hasText()) {
            return (
                <span className='gh-portal-triggerbtn-label'> {buttonText} </span>
            );
        }
        return null;
    }

    onToggle() {
        const {showPopup, member, site} = this.context;
        if (showPopup) {
            this.context.onAction('closePopup');
        } else {
            const loggedOutPage = isInviteOnlySite({site}) ? 'signin' : 'signup';
            const page = member ? 'accountHome' : loggedOutPage;
            this.context.onAction('openPopup', {page});
        }
    }

    render() {
        const hasText = this.hasText();
        const {member} = this.context;
        const triggerBtnClass = member ? 'halo' : '';

        if (hasText) {
            return (
                <div className='gh-portal-triggerbtn-wrapper' ref={this.container}>
                    <div
                        className='gh-portal-triggerbtn-container with-label'
                        onClick={e => this.onToggle(e)}
                        data-testid='portal-trigger-button'
                    >
                        {this.renderTriggerIcon()}
                        {(hasText ? this.renderText() : '')}
                    </div>
                </div>
            );
        }
        return (
            <div className='gh-portal-triggerbtn-wrapper'>
                <div
                    className={'gh-portal-triggerbtn-container ' + triggerBtnClass}
                    onClick={e => this.onToggle(e)}
                    data-testid='portal-trigger-button'
                >
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

    renderFrameStyles() {
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor}
            }
        ` + TriggerButtonStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    }

    render() {
        const {portal_button: portalButton} = this.context.site;
        const {showPopup} = this.context;

        if (!portalButton || hasMode(['offerPreview'])) {
            return null;
        }

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
            <Frame dataTestId='portal-trigger-frame' className='gh-portal-triggerbtn-iframe' style={frameStyle} title="portal-trigger" head={this.renderFrameStyles()}>
                <TriggerButtonContent isPopupOpen={showPopup} updateWidth={width => this.onWidthChange(width)} />
            </Frame>
        );
    }
}
