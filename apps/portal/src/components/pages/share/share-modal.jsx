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
import { tw } from '../../../utils/tw';

const shareActionClass = tw`relative flex h-11 max-w-[70px] min-w-0 cursor-pointer items-center justify-center rounded-lg border border-solid border-gray-200 bg-white px-4 py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-gray-900 no-underline outline-none select-none transition-control hover:border-gray-300 max-[421px]:w-full max-[421px]:max-w-none max-[421px]:flex-none`;

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
    <div className="relative scrollbar-none ">
      <CloseButton placement="share" />
      <div className="mb-5">
        <h1 className="text-left text-21 leading-[1.1em] font-semibold text-pretty text-black rtl:text-right">
          {t('Share')}
        </h1>
      </div>

      <div className="flex flex-col rounded-xl border border-solid border-gray-200">
        {shareImage && (
          <img
            className="aspect-video w-full rounded-t-xl bg-gray-50 object-cover"
            src={shareImage}
            alt=""
            data-testid="share-preview-image"
          />
        )}
        <div className="flex flex-col gap-4 p-4">
          {shareTitle && (
            <h2 className="m-0 text-19 leading-[1.35] font-semibold text-pretty text-black">
              {shareTitle}
            </h2>
          )}
          {shareExcerpt && (
            <p className="mx-0 mt-[-8px] mb-0 line-clamp-3 text-15 leading-[1.45] text-pretty text-gray-700">
              {shareExcerpt}
            </p>
          )}
          {(shareFavicon || shareSiteName || shareAuthor) && (
            <div className="mt-[-6px] flex min-h-[18px] items-center gap-2">
              {shareFavicon && (
                <img
                  className="size-4 flex-none rounded object-cover"
                  src={shareFavicon}
                  alt=""
                  data-testid="share-preview-favicon"
                />
              )}
              <div className="gh-portal-share-preview-meta flex min-w-0 items-center gap-1 truncate text-13.5 leading-[1.3] text-gray-900">
                {shareSiteName && (
                  <span className="min-w-0 overflow-hidden font-medium text-ellipsis">
                    {shareSiteName}
                  </span>
                )}
                {shareSiteName && shareAuthor && (
                  <span className="flex-none" aria-hidden="true">
                    |
                  </span>
                )}
                {shareAuthor && (
                  <span className="min-w-0 overflow-hidden text-ellipsis">{shareAuthor}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="gh-portal-share-actions relative mt-5 flex items-center gap-3 max-[421px]:flex-col max-[421px]:items-stretch">
        <button
          className="gh-portal-btn gh-portal-share-action copy relative flex h-11 w-auto max-w-none min-w-0 flex-[1_0_auto] cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[color:var(--brandcolor,#3eb0ef)] px-[14px] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-white no-underline outline-none select-none transition-control hover:border-gray-300 disabled:cursor-auto disabled:opacity-50! max-[421px]:order-1"
          type="button"
          onClick={onCopy}
          aria-label={copied ? t('Copied') : t('Copy link')}
          title={copied ? t('Copied') : t('Copy link')}
        >
          {copied ? (
            <span
              className="copied inline-flex size-5 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--brandcolor)_14%,var(--color-white))] leading-[0] text-brand [&_svg]:size-3 [&_svg_path]:stroke-current"
              aria-hidden="true"
            >
              <CheckmarkIcon />
            </span>
          ) : (
            <span
              className="inline-flex size-5 items-center justify-center rounded-full leading-[0] [&_svg]:size-5"
              aria-hidden="true"
            >
              <LinkIcon />
            </span>
          )}
          <span className="text-14 leading-none font-medium whitespace-nowrap text-white">
            {copied ? t('Copied') : t('Copy link')}
          </span>
        </button>

        <a
          className={`gh-portal-btn gh-portal-share-action twitter ${shareActionClass} max-[421px]:order-2`}
          href={socialLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('X (Twitter)')}
          title={t('X (Twitter)')}
        >
          <span
            className="x inline-flex size-5 items-center justify-center rounded-full leading-[0] [&_svg]:size-4"
            aria-hidden="true"
          >
            <XIcon />
          </span>
        </a>

        <a
          className={`gh-portal-btn gh-portal-share-action linkedin ${shareActionClass} max-[421px]:order-3`}
          href={socialLinks.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('LinkedIn')}
          title={t('LinkedIn')}
        >
          <span
            className="inline-flex size-5 items-center justify-center rounded-full leading-[0] [&_svg]:size-5"
            aria-hidden="true"
          >
            <LinkedinIcon />
          </span>
        </a>

        <a
          className={`gh-portal-btn gh-portal-share-action email ${shareActionClass} max-[421px]:order-4`}
          href={socialLinks.email}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('Email')}
          title={t('Email')}
        >
          <span
            className="inline-flex size-5 items-center justify-center rounded-full leading-[0] [&_svg]:size-5"
            aria-hidden="true"
          >
            <EnvelopeIcon />
          </span>
        </a>

        <div
          className="gh-portal-share-more relative max-[421px]:order-5 max-[421px]:w-full"
          ref={moreMenuRef}
        >
          <button
            className="gh-portal-btn gh-portal-share-action more relative flex h-11 max-w-[70px] min-w-0 cursor-pointer items-center justify-center rounded-lg border border-solid border-gray-200 bg-white px-4 py-0 text-center text-20 leading-none font-bold tracking-[0px] whitespace-nowrap text-gray-900 no-underline outline-none select-none transition-control hover:border-gray-300 disabled:cursor-auto disabled:opacity-50! max-[421px]:w-full max-[421px]:max-w-none max-[421px]:flex-none"
            type="button"
            onClick={onToggleMoreMenu}
            aria-label={t('More options')}
            title={t('More options')}
            aria-haspopup="menu"
            aria-expanded={isMoreMenuOpen}
          >
            <span
              className="inline-flex size-5 items-center justify-center rounded-full leading-[0] [&_svg]:size-5"
              aria-hidden="true"
            >
              <EllipsisIcon />
            </span>
          </button>
          {isMoreMenuOpen && (
            <div
              className="absolute right-0 bottom-[calc(100%+8px)] z-[2] flex min-w-[180px] origin-bottom-right [transform:translateY(8px)] animate-share-menu-in flex-col rounded-lg border border-solid border-gray-200 bg-white p-1.5 opacity-0 [box-shadow:0_8px_20px_rgba(var(--blackrgb),0.12)] max-[421px]:inset-x-0 rtl:right-auto rtl:left-0 rtl:origin-bottom-left max-[421px]:rtl:right-0"
              role="menu"
              aria-label={t('More options')}
            >
              <a
                className="flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-14 leading-none font-medium text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
                  aria-hidden="true"
                >
                  <FacebookIcon />
                </span>
                <span>{t('Facebook')}</span>
              </a>
              <a
                className="flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-14 leading-none font-medium text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.threads}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
                  aria-hidden="true"
                >
                  <ThreadsIcon />
                </span>
                <span>{t('Threads')}</span>
              </a>
              <a
                className="flex h-9 items-center gap-2 rounded-md border-none px-2.5 py-0 text-14 leading-none font-medium text-gray-950 no-underline hover:bg-gray-50"
                href={socialLinks.bluesky}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                onClick={onClickMoreItem}
              >
                <span
                  className="inline-flex size-4 items-center justify-center leading-[0] [&_svg]:size-4"
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
