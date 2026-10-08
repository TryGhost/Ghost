import CloseButton from '../../common/close-button';
import copyTextToClipboard from '../../../utils/copy-to-clipboard';
import useShareData from './use-share-data';
import BlueSkyIcon from '../../../images/icons/share-bluesky.svg?react';
import CheckmarkIcon from '../../../images/icons/checkmark.svg?react';
import EnvelopeIcon from '../../../images/icons/envelope.svg?react';
import EllipsisIcon from '../../../images/icons/ellipsis.svg?react';
import FacebookIcon from '../../../images/icons/share-facebook.svg?react';
import LinkIcon from '../../../images/icons/share-link.svg?react';
import LinkedinIcon from '../../../images/icons/share-linkedin.svg?react';
import ThreadsIcon from '../../../images/icons/share-threads.svg?react';
import XIcon from '../../../images/icons/share-x.svg?react';
import { useEffect, useRef, useState } from 'react';
import { t } from '../../../utils/i18n';

const shareActionClass =
  'relative flex h-11 min-w-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg text-center no-underline [outline:none] [transition:all_.25s_ease] hover:border-gray-300 max-w-[70px] border border-solid border-gray-200 bg-white px-4 py-0 text-gray-900 max-[420px]:w-full max-[420px]:max-w-none max-[420px]:flex-none text-base font-medium leading-[1em] tracking-[0.2px]';

const ShareModal = () => {
  const [copied, setCopied] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const copyTimeoutRef = useRef();
  const moreMenuRef = useRef(null);

  const {
    shareUrl,
    shareTitle,
    shareExcerpt,
    shareImage,
    shareFavicon,
    shareSiteName,
    shareAuthor,
    socialLinks,
  } = useShareData();

  useEffect(() => {
    return () => {
      clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    // Portal renders inside an iframe via createPortal, so `document` here
    // refers to the parent page's document — not the iframe's. We must use
    // ownerDocument of the rendered element to attach listeners in the
    // correct document context where the click events actually fire.
    const doc = moreMenuRef.current?.ownerDocument || document;

    const onDocumentClickCapture = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        event.stopPropagation();
        event.preventDefault();
        setIsMoreMenuOpen(false);
      }
    };

    const onDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };

    doc.addEventListener('click', onDocumentClickCapture, true);
    doc.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      doc.removeEventListener('click', onDocumentClickCapture, true);
      doc.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isMoreMenuOpen]);

  const onCopy = async () => {
    const copySuccess = await copyTextToClipboard(shareUrl);
    if (!copySuccess) {
      return;
    }

    setCopied(true);
    clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const onToggleMoreMenu = () => {
    setIsMoreMenuOpen((isOpen) => !isOpen);
  };

  const onClickMoreItem = () => {
    setIsMoreMenuOpen(false);
  };

  return (
    <div className="gh-portal-content gh-portal-share relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_.gh-portal-closeicon-container]:top-5">
      <CloseButton />
      <div className="gh-portal-share-header mb-5">
        <h1 className="gh-portal-main-title text-pretty text-left text-[2.1rem] font-semibold leading-[1.1em] text-black rtl:text-right">
          {t('Share')}
        </h1>
      </div>

      <div className="gh-portal-share-preview flex flex-col rounded-xl border border-solid border-gray-200">
        {shareImage && (
          <img
            className="gh-portal-share-preview-image aspect-video w-full rounded-t-xl bg-gray-50 object-cover"
            src={shareImage}
            alt=""
            data-testid="share-preview-image"
          />
        )}
        <div className="gh-portal-share-preview-content flex flex-col gap-4 p-4">
          {shareTitle && (
            <h2 className="gh-portal-share-preview-title m-0 text-pretty text-[1.9rem] font-semibold leading-[1.35] text-black">
              {shareTitle}
            </h2>
          )}
          {shareExcerpt && (
            <p className="gh-portal-share-preview-excerpt mx-0 mb-0 mt-[-8px] line-clamp-3 text-pretty text-base leading-[1.45] text-gray-700">
              {shareExcerpt}
            </p>
          )}
          {(shareFavicon || shareSiteName || shareAuthor) && (
            <div className="gh-portal-share-preview-footer mt-[-6px] flex min-h-[18px] items-center gap-2">
              {shareFavicon && (
                <img
                  className="gh-portal-share-preview-favicon size-4 flex-none rounded object-cover"
                  src={shareFavicon}
                  alt=""
                  data-testid="share-preview-favicon"
                />
              )}
              <div className="gh-portal-share-preview-meta flex min-w-0 items-center gap-1 truncate text-[1.35rem] leading-[1.3] text-gray-900">
                {shareSiteName && (
                  <span className="gh-portal-share-preview-site min-w-0 overflow-hidden text-ellipsis font-medium">
                    {shareSiteName}
                  </span>
                )}
                {shareSiteName && shareAuthor && (
                  <span className="gh-portal-share-preview-separator flex-none" aria-hidden="true">
                    |
                  </span>
                )}
                {shareAuthor && (
                  <span className="gh-portal-share-preview-author min-w-0 overflow-hidden text-ellipsis">
                    {shareAuthor}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="gh-portal-share-actions relative mt-5 flex items-center gap-3 max-[420px]:flex-col max-[420px]:items-stretch">
        <button
          className="gh-portal-btn gh-portal-share-action copy relative flex h-11 w-auto min-w-0 max-w-none flex-[1_0_auto] cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border-none bg-[color:var(--brandcolor,#3eb0ef)] px-[14px] py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-white no-underline [outline:none] [transition:all_.25s_ease] hover:border-gray-300 disabled:cursor-auto disabled:!opacity-50 max-[420px]:order-1"
          type="button"
          onClick={onCopy}
          aria-label={copied ? t('Copied') : t('Copy link')}
          title={copied ? t('Copied') : t('Copy link')}
        >
          {copied ? (
            <span
              className="gh-portal-share-icon copied inline-flex size-5 items-center justify-center rounded-[999px] bg-[color:color-mix(in_srgb,var(--brandcolor)_14%,theme(colors.white))] leading-[0] text-brand [&_svg]:size-3 [&_svg_path]:stroke-current"
              aria-hidden="true"
            >
              <CheckmarkIcon />
            </span>
          ) : (
            <span
              className="gh-portal-share-icon inline-flex size-5 items-center justify-center rounded-[999px] leading-[0] [&_svg]:size-5"
              aria-hidden="true"
            >
              <LinkIcon />
            </span>
          )}
          <span className="gh-portal-share-label whitespace-nowrap text-md font-medium leading-none text-white">
            {copied ? t('Copied') : t('Copy link')}
          </span>
        </button>

        <a
          className={`gh-portal-btn gh-portal-share-action twitter ${shareActionClass} max-[420px]:order-2`}
          href={socialLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('X (Twitter)')}
          title={t('X (Twitter)')}
        >
          <span
            className="gh-portal-share-icon x inline-flex size-5 items-center justify-center rounded-[999px] leading-[0] [&_svg]:size-4"
            aria-hidden="true"
          >
            <XIcon />
          </span>
        </a>

        <a
          className={`gh-portal-btn gh-portal-share-action linkedin ${shareActionClass} max-[420px]:order-3`}
          href={socialLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('LinkedIn')}
          title={t('LinkedIn')}
        >
          <span
            className="gh-portal-share-icon inline-flex size-5 items-center justify-center rounded-[999px] leading-[0] [&_svg]:size-5"
            aria-hidden="true"
          >
            <LinkedinIcon />
          </span>
        </a>

        <a
          className={`gh-portal-btn gh-portal-share-action email ${shareActionClass} max-[420px]:order-4`}
          href={socialLinks.email}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('Email')}
          title={t('Email')}
        >
          <span
            className="gh-portal-share-icon inline-flex size-5 items-center justify-center rounded-[999px] leading-[0] [&_svg]:size-5"
            aria-hidden="true"
          >
            <EnvelopeIcon />
          </span>
        </a>

        <div
          className="gh-portal-share-more relative max-[420px]:order-5 max-[420px]:w-full"
          ref={moreMenuRef}
        >
          <button
            className="gh-portal-btn gh-portal-share-action more relative flex h-11 min-w-0 max-w-[70px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg border border-solid border-gray-200 bg-white px-4 py-0 text-center text-2xl font-bold leading-none tracking-[0px] text-gray-900 no-underline [outline:none] [transition:all_.25s_ease] hover:border-gray-300 disabled:cursor-auto disabled:!opacity-50 max-[420px]:w-full max-[420px]:max-w-none max-[420px]:flex-none"
            type="button"
            onClick={onToggleMoreMenu}
            aria-label={t('More options')}
            title={t('More options')}
            aria-haspopup="menu"
            aria-expanded={isMoreMenuOpen}
          >
            <span
              className="gh-portal-share-icon inline-flex size-5 items-center justify-center rounded-[999px] leading-[0] [&_svg]:size-5"
              aria-hidden="true"
            >
              <EllipsisIcon />
            </span>
          </button>
          {isMoreMenuOpen && (
            <div
              className="gh-portal-share-more-menu absolute bottom-[calc(100%+8px)] right-0 z-[2] flex min-w-[180px] origin-bottom-right translate-y-2 animate-[gh-portal-share-more-menu-in_0.18s_ease-out_forwards] flex-col rounded-lg border border-solid border-gray-200 bg-white p-1.5 opacity-0 [box-shadow:0_8px_20px_rgba(var(--blackrgb),0.12)] max-[420px]:inset-x-0 rtl:left-0 rtl:right-auto rtl:origin-bottom-left max-[420px]:rtl:right-0"
              role="menu"
              aria-label={t('More options')}
            >
              <a
                className="gh-portal-share-more-item flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-md font-medium leading-none text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="gh-portal-share-more-item-icon inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
                  aria-hidden="true"
                >
                  <FacebookIcon />
                </span>
                <span>{t('Facebook')}</span>
              </a>
              <a
                className="gh-portal-share-more-item flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-md font-medium leading-none text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.threads}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="gh-portal-share-more-item-icon inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
                  aria-hidden="true"
                >
                  <ThreadsIcon />
                </span>
                <span>{t('Threads')}</span>
              </a>
              <a
                className="gh-portal-share-more-item flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-md font-medium leading-none text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.bluesky}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="gh-portal-share-more-item-icon inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
                  aria-hidden="true"
                >
                  <BlueSkyIcon />
                </span>
                <span>{t('Bluesky')}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
