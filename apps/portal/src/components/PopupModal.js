import React from 'react';
import Frame from './Frame';
import {hasMode} from '../utils/check-mode';
import AppContext from '../AppContext';
import {getFrameStyles} from './Frame.styles';
import Pages, {getActivePage} from '../pages';
import PopupNotification from './common/PopupNotification';
import PoweredBy from './common/PoweredBy';
import {getSiteProducts, hasAvailablePrices, isInviteOnly, isCookiesDisabled, hasFreeProductPrice, hasCaptchaEnabled, getCaptchaSitekey} from '../utils/helpers';
import HCaptcha from '@hcaptcha/react-hcaptcha';

const StylesWrapper = () => {
    return {
        modalContainer: {
            zIndex: '3999999',
            position: 'fixed',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        },
        frame: {
            common: {
                margin: 'auto',
                position: 'relative',
                padding: '0',
                outline: '0',
                width: '100%',
                opacity: '1',
                overflow: 'hidden',
                height: '100%'
            }
        },
        page: {
            links: {
                width: '600px'
            }
        }
    };
};

function CookieDisabledBanner({message}) {
    const cookieDisabled = isCookiesDisabled();
    if (cookieDisabled) {
        return (
            <div className='gh-portal-cookiebanner'>{message}</div>
        );
    }
    return null;
}

class PopupContent extends React.Component {
    static contextType = AppContext;

    componentDidMount() {
        // Handle Esc to close popup
        if (this.node && !hasMode(['preview']) && !this.props.isMobile) {
            this.node.focus();
            this.keyUphandler = (event) => {
                if (event.key === 'Escape') {
                    this.dismissPopup(event);
                }
            };
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
            this.node.ownerDocument.addEventListener('keyup', this.keyUphandler);
        }
        this.sendContainerHeightChangeEvent();
    }

    dismissPopup(event) {
        const eventTargetTag = (event.target && event.target.tagName);
        // If focused on input field, only allow close if no value entered
        const allowClose = eventTargetTag !== 'INPUT' || (eventTargetTag === 'INPUT' && !event?.target?.value);
        if (allowClose) {
            this.context.onAction('closePopup');
        }
    }

    sendContainerHeightChangeEvent() {
        if (this.node && hasMode(['preview'])) {
            if (this.node?.clientHeight !== this.lastContainerHeight) {
                this.lastContainerHeight = this.node?.clientHeight;
                window.document.body.style.overflow = 'hidden';
                window.document.body.style['scrollbar-width'] = 'none';
                window.parent.postMessage({
                    type: 'portal-preview-updated',
                    payload: {
                        height: this.lastContainerHeight
                    }
                }, '*');
            }
        }
    }

    componentDidUpdate() {
        this.sendContainerHeightChangeEvent();
    }

    componentWillUnmount() {
        if (this.node) {
            this.node.ownerDocument.removeEventListener('keyup', this.keyUphandler);
        }
    }

    handlePopupClose(e) {
        if (hasMode(['preview'])) {
            return;
        }
        if (e.target === e.currentTarget) {
            this.context.onAction('closePopup');
        }
    }

    renderActivePage() {
        const {page} = this.context;
        getActivePage({page});
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    }

    renderPopupNotification() {
        const {popupNotification} = this.context;
        if (!popupNotification || !popupNotification.type) {
            return null;
        }
        return (
            <PopupNotification />
        );
    }

    renderHCaptcha() {
        const {site, captchaRef} = this.context;

        if (hasCaptchaEnabled({site})) {
            return (
                <HCaptcha
                    size="invisible"
                    sitekey={getCaptchaSitekey({site})}
                    onVerify={token => this.context.onAction('verifyCaptcha', {token})}
                    onError={error => this.context.onAction('captchaError', {error})}
                    ref={captchaRef}
                    id="hcaptcha-portal"
                />
            );
        } else {
            return null;
        }
    }

    sendPortalPreviewReadyEvent() {
        if (window.self !== window.parent) {
            window.parent.postMessage({
                type: 'portal-preview-ready',
                payload: {}
            }, '*');
        }
    }

    render() {
        const {page, pageQuery, site, customSiteUrl} = this.context;
        const products = getSiteProducts({site, pageQuery});
        const noOfProducts = products.length;

        getActivePage({page});
        const Styles = StylesWrapper({page});
        const pageStyle = {
            ...Styles.page[page]
        };
        let popupWidthStyle = '';
        let popupSize = 'regular';

        let cookieBannerText = '';
        let pageClass = page;
        switch (page) {
        case 'signup':
            cookieBannerText = 'Cookies must be enabled in your browser to sign up.';
            break;
        case 'signin':
            cookieBannerText = 'Cookies must be enabled in your browser to sign in.';
            break;
        case 'accountHome':
            pageClass = 'account-home';
            break;
        case 'accountProfile':
            pageClass = 'account-profile';
            break;
        case 'accountPlan':
            pageClass = 'account-plan';
            break;
        default:
            cookieBannerText = 'Cookies must be enabled in your browser.';
            pageClass = page;
            break;
        }

        if (noOfProducts > 1 && !isInviteOnly({site}) && hasAvailablePrices({site, pageQuery})) {
            if (page === 'signup') {
                pageClass += ' full-size';
                popupSize = 'full';
            }
        }

        const freeProduct = hasFreeProductPrice({site});
        if ((freeProduct && noOfProducts > 2) || (!freeProduct && noOfProducts > 1)) {
            if (page === 'accountPlan') {
                pageClass += ' full-size';
                popupSize = 'full';
            }
        }

        if (page === 'emailSuppressionFAQ' || page === 'emailReceivingFAQ') {
            pageClass += ' large-size';
        }

        let className = 'gh-portal-popup-container';

        if (hasMode(['preview'])) {
            pageClass += ' preview';
        }

        if (hasMode(['preview'], {customSiteUrl}) && !site.disableBackground) {
            className += ' preview';
        }

        if (hasMode(['dev'])) {
            className += ' dev';
        }

        const containerClassName = `${className} ${popupWidthStyle} ${pageClass}`;
        this.sendPortalPreviewReadyEvent();
        return (
            <>
                <div className={'gh-portal-popup-wrapper ' + pageClass} onClick={e => this.handlePopupClose(e)}>
                    {this.renderPopupNotification()}
                    {this.renderHCaptcha()}
                    <div className={containerClassName} style={pageStyle} ref={node => (this.node = node)} tabIndex={-1}>
                        <CookieDisabledBanner message={cookieBannerText} />
                        {this.renderActivePage()}
                        {(popupSize === 'full' ?
                            <div className={'gh-portal-powered inside ' + (hasMode(['preview']) ? 'hidden ' : '') + pageClass}>
                                <PoweredBy />
                            </div>
                            : '')}
                    </div>
                </div>
                <div className={'gh-portal-powered outside ' + (hasMode(['preview']) ? 'hidden ' : '') + pageClass}>
                    <PoweredBy />
                </div>
            </>
        );
    }
}

export default class PopupModal extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            height: null
        };
    }

    renderCurrentPage(page) {
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    }

    onHeightChange(height) {
        this.setState({height});
    }

    handlePopupClose(e) {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            this.context.onAction('closePopup');
        }
    }

    renderFrameStyles() {
        const {site} = this.context;
        const FrameStyle = getFrameStyles({site});
        const styles = `
            :root {
                --brandcolor: ${this.context.brandColor}
            }
        ` + FrameStyle;
        return (
            <>
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </>
        );
    }

    renderFrameContainer() {
        const {member, site, customSiteUrl} = this.context;
        const Styles = StylesWrapper({member});
        const isMobile = window.innerWidth < 480;

        const frameStyle = {
            ...Styles.frame.common
        };

        let className = 'gh-portal-popup-background';
        if (hasMode(['preview'])) {
            Styles.modalContainer.zIndex = '3999997';
        }

        if (hasMode(['preview'], {customSiteUrl}) && !site.disableBackground) {
            className += ' preview';
        }

        if (hasMode(['dev'])) {
            className += ' dev';
        }

        return (
            <div style={Styles.modalContainer}>
                <Frame style={frameStyle} title="portal-popup" head={this.renderFrameStyles()} dataTestId='portal-popup-frame'
                    dataDir={this.context.dir}
                >
                    <div className={className} onClick = {e => this.handlePopupClose(e)}></div>
                    <PopupContent isMobile={isMobile} />
                </Frame>
            </div>
        );
    }

    render() {
        const {showPopup} = this.context;
        if (showPopup) {
            return this.renderFrameContainer();
        }
        return null;
    }
}
