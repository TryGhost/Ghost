import {useContext, useEffect, useRef} from 'react';
import Frame from './Frame';
import {hasMode} from '../utils/check-mode';
import AppContext from '../AppContext';
import {getFrameStyles} from './Frame.styles';
import Pages, {getActivePage} from '../pages';
import PopupNotification from './common/PopupNotification';
import PoweredBy from './common/PoweredBy';
import {getSiteProducts, hasAvailablePrices, isInviteOnly, isCookiesDisabled, hasFreeProductPrice} from '../utils/helpers';

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

function PopupContent({isMobile}) {
    const context = useContext(AppContext);
    const {page, pageQuery, site, customSiteUrl, popupNotification, otcRef, doAction} = context;

    const nodeRef = useRef(null);
    const keyUphandlerRef = useRef(null);
    const lastContainerHeightRef = useRef(null);

    const dismissPopup = (event) => {
        const eventTargetTag = (event.target && event.target.tagName);
        // If focused on input field, only allow close if no value entered
        const allowClose = eventTargetTag !== 'INPUT' || (eventTargetTag === 'INPUT' && !event?.target?.value);
        if (allowClose) {
            doAction('closePopup');
        }
    };

    const sendContainerHeightChangeEvent = () => {
        if (nodeRef.current && hasMode(['preview'])) {
            if (nodeRef.current?.clientHeight !== lastContainerHeightRef.current) {
                lastContainerHeightRef.current = nodeRef.current?.clientHeight;
                window.document.body.style.overflow = 'hidden';
                window.document.body.style['scrollbar-width'] = 'none';
                window.parent.postMessage({
                    type: 'portal-preview-updated',
                    payload: {
                        height: lastContainerHeightRef.current
                    }
                }, '*');
            }
        }
    };

    const sendPortalPreviewReadyEvent = () => {
        if (window.self !== window.parent) {
            window.parent.postMessage({
                type: 'portal-preview-ready',
                payload: {}
            }, '*');
        }
    };

    // Handle Esc to close popup and initial height change
    useEffect(() => {
        if (nodeRef.current && !hasMode(['preview']) && !isMobile) {
            nodeRef.current.focus();
            keyUphandlerRef.current = (event) => {
                if (event.key === 'Escape') {
                    dismissPopup(event);
                }
            };
            nodeRef.current.ownerDocument.removeEventListener('keyup', keyUphandlerRef.current);
            nodeRef.current.ownerDocument.addEventListener('keyup', keyUphandlerRef.current);
        }
        sendContainerHeightChangeEvent();

        return () => {
            if (nodeRef.current && keyUphandlerRef.current) {
                nodeRef.current.ownerDocument.removeEventListener('keyup', keyUphandlerRef.current);
            }
        };
    }, [isMobile]); // Only re-run if isMobile changes

    // Send height change events on every render (replicates componentDidUpdate)
    useEffect(() => {
        sendContainerHeightChangeEvent();
    });

    const handlePopupClose = (e) => {
        if (hasMode(['preview']) || (otcRef && page === 'magiclink')) {
            return;
        }
        if (e.target === e.currentTarget) {
            doAction('closePopup');
        }
    };

    const renderActivePage = () => {
        getActivePage({page});
        const PageComponent = Pages[page];

        return (
            <PageComponent />
        );
    };

    const renderPopupNotification = () => {
        if (!popupNotification || !popupNotification.type) {
            return null;
        }
        return (
            <PopupNotification />
        );
    };

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
    sendPortalPreviewReadyEvent();
    return (
        <>
            <div className={'gh-portal-popup-wrapper ' + pageClass} onClick={e => handlePopupClose(e)}>
                {renderPopupNotification()}
                <div className={containerClassName} style={pageStyle} ref={nodeRef} tabIndex={-1}>
                    <CookieDisabledBanner message={cookieBannerText} />
                    {renderActivePage()}
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

export default function PopupModal() {
    const context = useContext(AppContext);
    const {showPopup, member, site, customSiteUrl, brandColor, dir, doAction} = context;

    const handlePopupClose = (e) => {
        e.preventDefault();
        if (e.target === e.currentTarget) {
            doAction('closePopup');
        }
    };

    const renderFrameStyles = () => {
        const FrameStyle = getFrameStyles({site});
        const styles = `
            :root {
                --brandcolor: ${brandColor}
            }
        ` + FrameStyle;
        return (
            <>
                <style dangerouslySetInnerHTML={{__html: styles}} />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </>
        );
    };

    const renderFrameContainer = () => {
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
                <Frame style={frameStyle} title="portal-popup" head={renderFrameStyles()} dataTestId='portal-popup-frame'
                    dataDir={dir}
                >
                    <div className={className} onClick = {e => handlePopupClose(e)}></div>
                    <PopupContent isMobile={isMobile} />
                </Frame>
            </div>
        );
    };

    if (showPopup) {
        return renderFrameContainer();
    }
    return null;
}
