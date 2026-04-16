import CloseButton from '../../common/close-button';
import copyTextToClipboard from '../../../utils/copy-to-clipboard';
import useShareData from './use-share-data';
import {ReactComponent as BlueSkyIcon} from '../../../images/icons/share-bluesky.svg';
import {ReactComponent as CheckmarkIcon} from '../../../images/icons/checkmark.svg';
import {ReactComponent as EnvelopeIcon} from '../../../images/icons/envelope.svg';
import {ReactComponent as EllipsisIcon} from '../../../images/icons/ellipsis.svg';
import {ReactComponent as FacebookIcon} from '../../../images/icons/share-facebook.svg';
import {ReactComponent as LinkIcon} from '../../../images/icons/share-link.svg';
import {ReactComponent as LinkedinIcon} from '../../../images/icons/share-linkedin.svg';
import {ReactComponent as ThreadsIcon} from '../../../images/icons/share-threads.svg';
import {ReactComponent as XIcon} from '../../../images/icons/share-x.svg';
import {useEffect, useRef, useState} from 'react';
import {t} from '../../../utils/i18n';

const ShareModal = () => {
    const [copied, setCopied] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const copyTimeoutRef = useRef();
    const moreMenuRef = useRef(null);

    const {shareUrl, shareTitle, shareExcerpt, shareImage, shareFavicon, shareSiteName, shareAuthor, socialLinks} = useShareData();

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

        const onDocumentMouseDown = (event) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
                setIsMoreMenuOpen(false);
            }
        };

        const onDocumentKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsMoreMenuOpen(false);
            }
        };

        doc.addEventListener('mousedown', onDocumentMouseDown);
        doc.addEventListener('keydown', onDocumentKeyDown);

        return () => {
            doc.removeEventListener('mousedown', onDocumentMouseDown);
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
        setIsMoreMenuOpen(isOpen => !isOpen);
    };

    const onClickMoreItem = () => {
        setIsMoreMenuOpen(false);
    };

    return (
        <div className='gh-portal-content gh-portal-share'>
            <CloseButton />
            <div className='gh-portal-share-header'>
                <h1 className='gh-portal-main-title'>{t('Share')}</h1>
            </div>

            <div className='gh-portal-share-preview'>
                {shareImage && <img className='gh-portal-share-preview-image' src={shareImage} alt='' data-testid='share-preview-image' />}
                <div className='gh-portal-share-preview-content'>
                    {shareTitle && <h2 className='gh-portal-share-preview-title'>{shareTitle}</h2>}
                    {shareExcerpt && <p className='gh-portal-share-preview-excerpt'>{shareExcerpt}</p>}
                    {(shareFavicon || shareSiteName || shareAuthor) && (
                        <div className='gh-portal-share-preview-footer'>
                            {shareFavicon && (
                                <img
                                    className='gh-portal-share-preview-favicon'
                                    src={shareFavicon}
                                    alt=''
                                    data-testid='share-preview-favicon'
                                />
                            )}
                            <div className='gh-portal-share-preview-meta'>
                                {shareSiteName && <span className='gh-portal-share-preview-site'>{shareSiteName}</span>}
                                {shareSiteName && shareAuthor && (
                                    <span className='gh-portal-share-preview-separator' aria-hidden='true'>|</span>
                                )}
                                {shareAuthor && (
                                    <span className='gh-portal-share-preview-author'>
                                        {shareAuthor}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className='gh-portal-share-actions'>
                <button
                    className='gh-portal-btn gh-portal-share-action copy'
                    type='button'
                    onClick={onCopy}
                    aria-label={copied ? t('Copied') : t('Copy link')}
                    title={copied ? t('Copied') : t('Copy link')}
                >
                    {copied ? (
                        <span className='gh-portal-share-icon copied' aria-hidden='true'>
                            <CheckmarkIcon />
                        </span>
                    ) : (
                        <span className='gh-portal-share-icon' aria-hidden='true'>
                            <LinkIcon />
                        </span>
                    )}
                    <span className='gh-portal-share-label'>{copied ? t('Copied') : t('Copy link')}</span>
                </button>

                <a
                    className='gh-portal-btn gh-portal-share-action twitter'
                    href={socialLinks.twitter}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={t('X (Twitter)')}
                    title={t('X (Twitter)')}
                >
                    <span className='gh-portal-share-icon x' aria-hidden='true'>
                        <XIcon />
                    </span>
                </a>

                <a
                    className='gh-portal-btn gh-portal-share-action linkedin'
                    href={socialLinks.linkedin}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={t('LinkedIn')}
                    title={t('LinkedIn')}
                >
                    <span className='gh-portal-share-icon' aria-hidden='true'>
                        <LinkedinIcon />
                    </span>
                </a>

                <a
                    className='gh-portal-btn gh-portal-share-action email'
                    href={socialLinks.email}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={t('Email')}
                    title={t('Email')}
                >
                    <span className='gh-portal-share-icon' aria-hidden='true'>
                        <EnvelopeIcon />
                    </span>
                </a>

                <div className='gh-portal-share-more' ref={moreMenuRef}>
                    <button
                        className='gh-portal-btn gh-portal-share-action more'
                        type='button'
                        onClick={onToggleMoreMenu}
                        aria-label={t('More options')}
                        title={t('More options')}
                        aria-haspopup='menu'
                        aria-expanded={isMoreMenuOpen}
                    >
                        <span className='gh-portal-share-icon' aria-hidden='true'>
                            <EllipsisIcon />
                        </span>
                    </button>
                    {isMoreMenuOpen && (
                        <div className='gh-portal-share-more-menu' role='menu' aria-label={t('More options')}>
                            <a
                                className='gh-portal-share-more-item'
                                href={socialLinks.facebook}
                                target='_blank'
                                rel='noopener noreferrer'
                                role='menuitem'
                                onClick={onClickMoreItem}
                            >
                                <span className='gh-portal-share-more-item-icon' aria-hidden='true'>
                                    <FacebookIcon />
                                </span>
                                <span>{t('Facebook')}</span>
                            </a>
                            <a
                                className='gh-portal-share-more-item'
                                href={socialLinks.threads}
                                target='_blank'
                                rel='noopener noreferrer'
                                role='menuitem'
                                onClick={onClickMoreItem}
                            >
                                <span className='gh-portal-share-more-item-icon' aria-hidden='true'>
                                    <ThreadsIcon />
                                </span>
                                <span>{t('Threads')}</span>
                            </a>
                            <a
                                className='gh-portal-share-more-item'
                                href={socialLinks.bluesky}
                                target='_blank'
                                rel='noopener noreferrer'
                                role='menuitem'
                                onClick={onClickMoreItem}
                            >
                                <span className='gh-portal-share-more-item-icon' aria-hidden='true'>
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
