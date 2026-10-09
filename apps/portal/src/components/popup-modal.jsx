import React from 'react';
import clsx from 'clsx';
import Frame from './frame';
import { hasMode } from '../utils/check-mode';
import AppContext from '../app-context';
import FrameStyles from './frame-styles';
import PopupStyles from '../styles/popup.css?inline';
import { getActivePage, getPages } from '../pages';
import PopupNotification from './common/popup-notification';
import PoweredBy from './common/powered-by';
import {
  getSiteProducts,
  hasAvailablePrices,
  isInviteOnly,
  isCookiesDisabled,
  hasFreeProductPrice,
} from '../utils/helpers';
import { tw } from '../utils/tw';

const poweredClasses = tw`absolute bottom-6 left-6 z-[9999] max-lg:relative max-lg:bottom-auto max-lg:left-auto max-lg:flex max-lg:w-full max-lg:justify-center max-lg:bg-white max-lg:pt-8 max-sm:pt-3 max-sm:pb-6 rtl:right-6 rtl:left-auto max-sm:[&.outside.feedback]:hidden [&.outside.full-size]:hidden [@media(min-width:480px)_and_(max-width:820px)]:[&.outside]:left-1/2 [@media(min-width:480px)_and_(max-width:820px)]:[&.outside]:[transform:translateX(-50%)] rtl:[@media(min-width:480px)_and_(max-width:820px)]:[&.outside]:left-auto`;

const StylesWrapper = () => {
  return {
    modalContainer: {
      zIndex: '3999999',
      position: 'fixed',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
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
        height: '100%',
      },
    },
    page: {
      links: {
        width: '600px',
      },
    },
  };
};

function CookieDisabledBanner({ message }) {
  const cookieDisabled = isCookiesDisabled();
  if (cookieDisabled) {
    return (
      <div className="bg-red p-2 text-center text-14 leading-[1.4em] tracking-[0.2px] text-white">
        {message}
      </div>
    );
  }
  return null;
}

export class PopupContent extends React.Component {
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
    const eventTargetTag = event.target && event.target.tagName;
    const isTextField = eventTargetTag === 'INPUT' || eventTargetTag === 'TEXTAREA';
    // If focused on a text field, only allow close if no value is entered.
    const allowClose = !isTextField || !event?.target?.value;
    if (allowClose) {
      this.context.doAction('closePopup');
    }
  }

  sendContainerHeightChangeEvent() {
    if (this.node && hasMode(['preview'])) {
      if (this.node?.clientHeight !== this.lastContainerHeight) {
        this.lastContainerHeight = this.node?.clientHeight;
        window.document.body.style.overflow = 'hidden';
        window.document.body.style['scrollbar-width'] = 'none';
        window.parent.postMessage(
          {
            type: 'portal-preview-updated',
            payload: {
              height: this.lastContainerHeight,
            },
          },
          '*',
        );
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
    const { page, otcRef } = this.context;
    if (hasMode(['preview']) || (otcRef && page === 'magiclink')) {
      return;
    }
    // Hard-to-trigger flows: require explicit dismissal via the X button
    if (page === 'giftRedemption' || page === 'giftSuccess') {
      return;
    }
    if (e.target === e.currentTarget) {
      this.context.doAction('closePopup');
    }
  }

  renderActivePage() {
    const { page, site } = this.context;
    getActivePage({ page });
    const Pages = getPages({ site });
    const PageComponent = Pages[page];

    return <PageComponent />;
  }

  renderPopupNotification() {
    const { popupNotification } = this.context;
    if (!popupNotification || !popupNotification.type) {
      return null;
    }
    return <PopupNotification />;
  }

  sendPortalPreviewReadyEvent() {
    if (window.self !== window.parent) {
      window.parent.postMessage(
        {
          type: 'portal-preview-ready',
          payload: {},
        },
        '*',
      );
    }
  }

  render() {
    const { page, pageQuery, site, customSiteUrl, lastPage } = this.context;
    const products = getSiteProducts({ site, pageQuery });
    const noOfProducts = products.length;

    getActivePage({ page });
    const Styles = StylesWrapper({ page });
    const pageStyle = {
      ...Styles.page[page],
    };
    const popupWidthStyle = '';
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

    if (noOfProducts > 1 && !isInviteOnly({ site }) && hasAvailablePrices({ site, pageQuery })) {
      if (page === 'signup') {
        pageClass += ' full-size';
        popupSize = 'full';
      }
    }

    if (page === 'gift' || page === 'giftSuccess' || page === 'giftRedemption') {
      pageClass += ' full-size';
      popupSize = 'full';
    }

    // Magic link page reached via gift redemption: render in the same
    // 50/50 layout (gift card stays visible on the right) instead of as
    // a small centered modal. Reuses the giftRedemption class so the
    // existing full-size CSS rules apply.
    if (page === 'magiclink' && lastPage === 'gift') {
      pageClass += ' full-size giftRedemption';
      popupSize = 'full';
    }

    const freeProduct = hasFreeProductPrice({ site });
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

    if (hasMode(['preview'], { customSiteUrl }) && !site.disableBackground) {
      className += ' preview';
    }

    if (hasMode(['dev'])) {
      className += ' dev';
    }

    const containerClassName = tw`${className} ${popupWidthStyle} ${pageClass} group/popup relative z-[9999] mx-auto mt-0 mb-10 box-border flex w-[500px] [transform:translateY(0px)] animate-popup flex-col justify-start rounded-[10px] bg-white p-8 text-start text-15 tracking-[0] shadow-popup outline-none [text-rendering:optimizeLegibility] max-sm:w-full! max-sm:animate-popup-mobile max-sm:overflow-visible max-sm:rounded-none max-sm:p-7! max-sm:[box-shadow:none]! max-sm:[&.account-home]:bg-gray-100 max-sm:[&.feedback]:absolute max-sm:[&.feedback]:inset-x-0 max-sm:[&.feedback]:bottom-0 max-sm:[&.feedback]:m-0! max-sm:[&.feedback]:animate-tray max-sm:[&.feedback]:rounded-t-[18px] max-sm:[&.feedback]:rounded-b-none [&.full-size]:m-0 [&.full-size]:min-h-screen [&.full-size]:w-screen [&.full-size]:origin-top [&.full-size]:animate-popup-full-size [&.full-size]:rounded-none [&.full-size]:px-[6vmin] [&.full-size]:pt-[2vmin] [&.full-size]:pb-[4vw] [&.full-size.account-plan]:pt-[4vw] [&.full-size.gift]:p-0 max-md:[&.full-size.gift]:p-0! [&.full-size.giftRedemption]:p-0 max-md:[&.full-size.giftRedemption]:p-0! [&.full-size.giftSuccess]:p-0 max-md:[&.full-size.giftSuccess]:p-0! [&.large-size]:w-full [&.large-size]:max-w-[720px] [&.large-size]:p-0 max-xl:[&.large-size]:max-w-[600px] max-sm:[&.large-size]:p-0! [&.preview]:animate-none! min-[520px]:group-[.full-size]/wrapper:[&.preview]:m-8 min-[520px]:group-[.full-size]/wrapper:[&.preview]:h-[calc(100vh-160px)] min-[520px]:group-[.full-size]/wrapper:[&.preview]:min-h-[unset] min-[520px]:group-[.full-size]/wrapper:[&.preview]:w-[calc(100vw-64px)] min-[520px]:group-[.full-size]/wrapper:[&.preview]:animate-none min-[520px]:group-[.full-size]/wrapper:[&.preview]:justify-start min-[520px]:group-[.full-size]/wrapper:[&.preview]:overflow-auto min-[520px]:group-[.full-size]/wrapper:[&.preview]:rounded-[12px] min-[520px]:group-[.full-size]/wrapper:[&.preview]:px-8 min-[520px]:group-[.full-size]/wrapper:[&.preview]:pt-8 min-[520px]:group-[.full-size]/wrapper:[&.preview]:pb-0 min-[520px]:group-[.full-size]/wrapper:[&.preview]:shadow-popup-preview [&.preview_*]:pointer-events-none! [&.preview.account-plan]:mx-auto [&.preview.account-plan]:mt-[3.2vw] [&.preview.account-plan]:mb-8 [&.preview.account-plan]:max-w-[420px] [&.preview.account-plan]:[zoom:0.9] max-sm:[&.preview.account-plan]:mt-0 min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:mx-auto min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:mt-[3.2vw] min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:mb-8 min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:size-auto min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:max-w-[420px] min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:pb-6 min-[520px]:group-[.full-size]/wrapper:[&.preview.account-plan]:[zoom:0.9] max-sm:[&.preview.full-size]:mb-0 max-sm:[&.preview.full-size]:max-h-[660px] [&.preview.offer]:mx-auto [&.preview.offer]:mt-[3.2vw] [&.preview.offer]:mb-8 [&.preview.offer]:max-w-[420px] [&.preview.offer]:[zoom:0.9] max-sm:[&.preview.offer]:mt-0 max-sm:[&.preview:not(.full-size)]:mb-0 max-sm:[&.preview:not(.full-size)]:max-h-[660px] max-sm:[&.preview:not(.full-size).account-plan]:max-h-[860px] max-sm:[&.preview:not(.full-size).account-plan]:pb-0! max-sm:[&.preview:not(.full-size).offer]:max-h-[860px] max-sm:[&.preview:not(.full-size).offer]:pb-0! [&.share]:w-[560px] max-sm:[&.share]:mb-0 max-sm:[&.share]:flex-[1_0_auto] max-xl:[&:not(.full-size):not(.large-size):not(.preview)]:w-[480px]`;
    const isGiftLayout =
      page === 'gift' ||
      page === 'giftSuccess' ||
      page === 'giftRedemption' ||
      (page === 'magiclink' && lastPage === 'gift');
    this.sendPortalPreviewReadyEvent();
    return (
      <>
        <div
          className={`gh-portal-popup-wrapper ${pageClass} group/wrapper relative -me-7.5! scrollbar-none h-full max-h-screen overflow-scroll px-0 pe-7.5! pt-[5vmin] pb-0 [-ms-overflow-style:none] max-sm:flex max-sm:flex-col max-sm:items-center max-sm:justify-between max-sm:overflow-y-auto max-sm:bg-white max-sm:p-0 max-sm:[&.account-home]:bg-gray-100 max-sm:[&.feedback]:relative max-sm:[&.feedback]:block max-sm:[&.feedback]:w-full max-sm:[&.feedback]:overflow-hidden max-sm:[&.feedback]:overflow-y-hidden! max-sm:[&.feedback]:bg-transparent max-sm:[&.feedback]:pe-0! [&.full-size]:h-screen [&.full-size]:p-0 [&.preview.account-plan]:pt-0 max-sm:[&.preview.full-size]:h-auto max-sm:[&.preview.full-size]:max-h-[660px] [&.preview.offer]:pt-0 [@media(min-width:480px)_and_(max-height:880px)]:pt-[4vmin]`}
          onClick={(e) => this.handlePopupClose(e)}
        >
          {this.renderPopupNotification()}
          <div
            className={containerClassName}
            style={pageStyle}
            ref={(node) => (this.node = node)}
            tabIndex={-1}
          >
            <CookieDisabledBanner message={cookieBannerText} />
            {this.renderActivePage()}
            {popupSize === 'full' && !isGiftLayout ? (
              <div
                className={clsx(
                  'inside',
                  hasMode(['preview']) && 'hidden!',
                  pageClass,
                  poweredClasses,
                )}
              >
                <PoweredBy />
              </div>
            ) : (
              ''
            )}
          </div>
        </div>
        {page !== 'share' && !isGiftLayout && (
          <div
            className={clsx(
              'outside',
              hasMode(['preview']) && 'hidden!',
              pageClass,
              poweredClasses,
            )}
          >
            <PoweredBy />
          </div>
        )}
      </>
    );
  }
}

export default class PopupModal extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);
    this.state = {
      height: null,
    };
  }

  renderCurrentPage(page) {
    const Pages = getPages({ site: this.context.site });
    const PageComponent = Pages[page];

    return <PageComponent />;
  }

  onHeightChange(height) {
    this.setState({ height });
  }

  handlePopupClose(e) {
    e.preventDefault();
    const { page } = this.context;
    // Hard-to-trigger flows: require explicit dismissal via the X button
    if (page === 'giftRedemption' || page === 'giftSuccess') {
      return;
    }
    if (e.target === e.currentTarget) {
      this.context.doAction('closePopup');
    }
  }

  renderFrameStyles() {
    return (
      <>
        <FrameStyles css={PopupStyles} brandColor={this.context.brandColor} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </>
    );
  }

  renderFrameContainer() {
    const { member, site, customSiteUrl } = this.context;
    const Styles = StylesWrapper({ member });
    const isMobile = window.innerWidth < 480;

    const frameStyle = {
      ...Styles.frame.common,
    };

    let className = tw`absolute inset-0 block [transform:translate3d(0,0,0)] animate-backdrop bg-[linear-gradient(315deg,rgb(0_0_0/0.2)_0%,rgb(0_0_0/0.1)_100%)] backdrop-blur-[2px] max-sm:animate-none [&.preview]:pointer-events-none [&.preview]:animate-none [&.preview]:bg-[linear-gradient(45deg,rgba(255,255,255,1)_0%,rgba(249,249,250,1)_100%)] [&.preview.preview-dark]:bg-[linear-gradient(45deg,var(--color-gray-950)_0%,var(--color-black)_100%)]`;
    if (hasMode(['preview'])) {
      Styles.modalContainer.zIndex = '3999997';
    }

    if (hasMode(['preview'], { customSiteUrl }) && !site.disableBackground) {
      className += ' preview';
      if (site.preview_theme === 'dark') {
        className += ' preview-dark';
      }
    }

    if (hasMode(['dev'])) {
      className += ' dev';
    }

    return (
      <div style={Styles.modalContainer}>
        <Frame
          style={frameStyle}
          title="portal-popup"
          head={this.renderFrameStyles()}
          dataTestId="portal-popup-frame"
          dataDir={this.context.dir}
        >
          <div className={className} onClick={(e) => this.handlePopupClose(e)}></div>
          <PopupContent isMobile={isMobile} />
        </Frame>
      </div>
    );
  }

  render() {
    const { showPopup } = this.context;
    if (showPopup) {
      return this.renderFrameContainer();
    }
    return null;
  }
}
