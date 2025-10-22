import {useContext, useEffect, useRef, useState} from 'react';
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
import {hasAvailablePrices, isInviteOnly, isSigninAllowed} from '../utils/helpers';
import {hasMode} from '../utils/check-mode';

const ICON_MAPPING = {
    'icon-1': ButtonIcon1,
    'icon-2': ButtonIcon2,
    'icon-3': ButtonIcon3,
    'icon-4': ButtonIcon4,
    'icon-5': ButtonIcon5
};

const Styles = ({hasText}) => {
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

function TriggerButtonContent({updateHeight, updateWidth}) {
    const context = useContext(AppContext);
    const container = useRef(null);
    const heightRef = useRef(null);
    const widthRef = useRef(null);

    useEffect(() => {
        if (container.current) {
            const height = container.current.offsetHeight;
            const width = container.current.offsetWidth;
            heightRef.current = height;
            widthRef.current = width;
            updateHeight?.(height);
            updateWidth?.(width);
        }
    });

    useEffect(() => {
        if (container.current) {
            const height = container.current.offsetHeight;
            const width = container.current.offsetWidth;

            if (height !== heightRef.current) {
                heightRef.current = height;
                updateHeight?.(height);
            }

            if (width !== widthRef.current) {
                widthRef.current = width;
                updateWidth?.(width);
            }
        }
    });

    const hasText = () => {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !context.member && buttonText;
    };

    const renderTriggerIcon = () => {
        const {portal_button_icon: buttonIcon = '', portal_button_style: buttonStyle = ''} = context.site || {};
        const Style = Styles({brandColor: context.brandColor});
        const memberGravatar = context.member && context.member.avatar_image;

        if (!buttonStyle.includes('icon') && !context.member) {
            return null;
        }

        if (memberGravatar) {
            return (
                <MemberGravatar gravatar={memberGravatar} />
            );
        }

        if (context.member) {
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
                if (hasText()) {
                    Style.userIcon.width = '26px';
                    Style.userIcon.height = '26px';
                }
                return (
                    <UserIcon style={Style.userIcon} />
                );
            }
        }
    };

    const renderText = () => {
        const {
            portal_button_signup_text: buttonText
        } = context.site;
        if (hasText()) {
            return (
                <span className='gh-portal-triggerbtn-label'> {buttonText} </span>
            );
        }
        return null;
    };

    const onToggle = () => {
        const {showPopup, member, site} = context;

        if (showPopup) {
            context.doAction('closePopup');
            return;
        }

        if (member) {
            context.doAction('openPopup', {page: 'accountHome'});
            return;
        }

        if (isSigninAllowed({site})) {
            const page = isInviteOnly({site}) || !hasAvailablePrices({site}) ? 'signin' : 'signup';
            context.doAction('openPopup', {page});
            return;
        }
    };

    const hasTextValue = hasText();
    const {member} = context;
    const triggerBtnClass = member ? 'halo' : '';

    if (hasTextValue) {
        return (
            <div className='gh-portal-triggerbtn-wrapper' ref={container}>
                <div
                    className='gh-portal-triggerbtn-container with-label'
                    onClick={onToggle}
                    data-testid='portal-trigger-button'
                >
                    {renderTriggerIcon()}
                    {(hasTextValue ? renderText() : '')}
                </div>
            </div>
        );
    }
    return (
        <div className='gh-portal-triggerbtn-wrapper'>
            <div
                className={'gh-portal-triggerbtn-container ' + triggerBtnClass}
                onClick={onToggle}
                data-testid='portal-trigger-button'
            >
                {renderTriggerIcon()}
            </div>
        </div>
    );
}

export default function TriggerButton() {
    const context = useContext(AppContext);
    const [width, setWidth] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    const buttonRef = useRef(null);
    const buttonMarginRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 640);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (buttonRef.current) {
                const iframeElement = buttonRef.current.node;
                if (iframeElement) {
                    buttonMarginRef.current = window.getComputedStyle(iframeElement).getPropertyValue('margin-right');
                }
            }
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    const hasText = () => {
        const {
            portal_button_signup_text: buttonText,
            portal_button_style: buttonStyle
        } = context.site;
        return ['icon-and-text', 'text-only'].includes(buttonStyle) && !context.member && buttonText;
    };

    const renderFrameStyles = () => {
        const styles = `
            :root {
                --brandcolor: ${context.brandColor}
            }
        ` + TriggerButtonStyle;
        return (
            <style dangerouslySetInnerHTML={{__html: styles}} />
        );
    };

    const site = context.site;
    const {portal_button: portalButton} = site;
    const {showPopup, scrollbarWidth} = context;

    if (isMobile) {
        return null;
    }

    if (!portalButton || !isSigninAllowed({site}) || hasMode(['offerPreview'])) {
        return null;
    }

    const hasTextValue = hasText();
    const Style = Styles({brandColor: context.brandColor, hasText: hasTextValue});

    const frameStyle = {
        ...Style.frame
    };
    if (width) {
        const updatedWidth = width + 2;
        frameStyle.width = `${updatedWidth}px`;
    }

    if (scrollbarWidth && showPopup) {
        frameStyle.marginRight = `calc(${scrollbarWidth}px + ${buttonMarginRef.current})`;
    }

    return (
        <Frame ref={buttonRef} dataTestId='portal-trigger-frame' className='gh-portal-triggerbtn-iframe' style={frameStyle} title="portal-trigger" head={renderFrameStyles()}>
            <TriggerButtonContent isPopupOpen={showPopup} updateWidth={setWidth} />
        </Frame>
    );
}
