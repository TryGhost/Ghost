import CloseButton from '../common/close-button';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import {ReactComponent as BlueSkyIcon} from '../../images/icons/share-bluesky.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import {ReactComponent as EllipsisIcon} from '../../images/icons/ellipsis.svg';
import {ReactComponent as FacebookIcon} from '../../images/icons/share-facebook.svg';
import {ReactComponent as LinkIcon} from '../../images/icons/share-link.svg';
import {ReactComponent as LinkedinIcon} from '../../images/icons/share-linkedin.svg';
import {ReactComponent as ThreadsIcon} from '../../images/icons/share-threads.svg';
import {ReactComponent as XIcon} from '../../images/icons/share-x.svg';
import {useEffect, useMemo, useRef, useState} from 'react';
import {t} from '../../utils/i18n';

export const ShareModalStyles = `
    .gh-portal-popup-container.share {
        width: 560px;
    }

    .gh-portal-share-header {
        margin-bottom: 20px;
    }

    .gh-portal-share-header .gh-portal-main-title {
        text-align: left;
        font-size: 2.1rem;
        font-weight: 600;
    }
    html[dir="rtl"] .gh-portal-share-header .gh-portal-main-title {
        text-align: right;
    }

    .gh-portal-share-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 20px;
        position: relative;
    }

    .gh-portal-share-preview {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--grey12);
        border-radius: 12px;
    }

    .gh-portal-share-preview-image {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 12px 12px 0 0;
        object-fit: cover;
        background: var(--grey14);
    }

    .gh-portal-share-preview-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
    }

    .gh-portal-share-preview-title {
        margin: 0;
        color: var(--grey0);
        font-size: 1.9rem;
        font-weight: 600;
        line-height: 1.35;
        text-wrap: pretty;
    }

    .gh-portal-share-preview-excerpt {
        margin: -2px 0 0;
        color: var(--grey6);
        font-size: 1.5rem;
        line-height: 1.45;
        text-wrap: pretty;
        margin-top: -8px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .gh-portal-share-preview-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: -6px;
        min-height: 18px;
    }

    .gh-portal-share-preview-favicon {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        object-fit: cover;
        flex: 0 0 auto;
    }

    .gh-portal-share-preview-meta {
        display: flex;
        align-items: center;
        min-width: 0;
        color: var(--grey3);
        font-size: 1.35rem;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gh-portal-share-preview-site,
    .gh-portal-share-preview-author {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .gh-portal-share-preview-site {
        font-weight: 500;
    }

    .gh-portal-share-action {
        height: 44px;
        max-width: 70px;
        min-width: 0;
        padding: 0 16px;
        border-radius: 8px;
        border: 1px solid var(--grey12);
        background: var(--white);
        color: var(--grey2);
    }

    .gh-portal-share-action:hover {
        border-color: var(--grey10);
    }

    .gh-portal-share-action.copy {
        width: auto;
        max-width: none;
        flex: 1 0 auto;
        padding: 0 14px;
        justify-content: center;
        border: none;
        color: var(--white);
        background: var(--black);
        gap: 8px;
    }

    .gh-portal-share-action.more {
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0;
    }

    .gh-portal-share-more {
        position: relative;
    }

    .gh-portal-share-more-menu {
        position: absolute;
        bottom: calc(100% + 8px);
        right: 0;
        display: flex;
        flex-direction: column;
        min-width: 180px;
        padding: 6px;
        border: 1px solid var(--grey12);
        border-radius: 8px;
        background: var(--white);
        box-shadow: 0 8px 20px rgba(var(--blackrgb), 0.12);
        z-index: 2;
        opacity: 0;
        transform: translateY(8px);
        transform-origin: bottom right;
        animation: gh-portal-share-more-menu-in 0.18s ease-out forwards;
    }
    html[dir="rtl"] .gh-portal-share-more-menu {
        right: unset;
        left: 0;
        transform-origin: bottom left;
    }

    @keyframes gh-portal-share-more-menu-in {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .gh-portal-share-more-item {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 36px;
        padding: 0 10px;
        color: var(--grey1);
        font-size: 1.4rem;
        font-weight: 500;
        line-height: 1;
        text-decoration: none;
        border-radius: 6px;
        border: none;
    }

    .gh-portal-share-more-item:hover {
        background: var(--grey14);
    }

    .gh-portal-share-more-item-icon {
        display: inline-flex;
        width: 16px;
        height: 16px;
        align-items: center;
        justify-content: center;
        line-height: 0;
    }

    .gh-portal-share-more-item-icon svg {
        width: 16px;
        height: 16px;
    }

    .gh-portal-share-label {
        font-size: 1.4rem;
        font-weight: 500;
        line-height: 1;
        color: var(--white);
        white-space: nowrap;
    }

    .gh-portal-share-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        line-height: 0;
    }

    .gh-portal-share-icon svg {
        width: 20px;
        height: 20px;
    }

    .gh-portal-share-icon.x svg {
        width: 16px;
        height: 16px;
    }

    .gh-portal-share-icon.copied {
        background: color-mix(in srgb, var(--brandcolor) 14%, var(--white));
        color: var(--brandcolor);
    }

    .gh-portal-share-icon.copied svg {
        width: 12px;
        height: 12px;
    }

    .gh-portal-share-icon.copied svg path {
        stroke: currentColor;
    }

    .gh-portal-share .gh-portal-closeicon-container {
        top: 20px;
    }

    @media (max-width: 420px) {
        .gh-portal-share-actions {
            flex-direction: column;
            align-items: stretch;
        }

        .gh-portal-share-action {
            width: 100%;
            max-width: none;
            flex: 0 0 auto;
        }

        .gh-portal-share-action.copy {
            order: 1;
            justify-content: center;
        }

        .gh-portal-share-action.twitter {
            order: 2;
        }

        .gh-portal-share-action.threads {
            order: 3;
        }

        .gh-portal-share-action.facebook {
            order: 4;
        }

        .gh-portal-share-action.email {
            order: 5;
        }

        .gh-portal-share-action.more {
            order: 6;
        }

        .gh-portal-share-more {
            width: 100%;
        }

        .gh-portal-share-more-menu {
            left: 0;
            right: 0;
        }
        html[dir="rtl"] .gh-portal-share-more-menu {
            left: 0;
            right: 0;
        }
    }

`;

const getCanonicalUrl = () => {
    return document.querySelector('link[rel="canonical"]')?.href || '';
};

const getOgTitle = () => {
    return document.querySelector('meta[property="og:title"]')?.content || '';
};

const getOgDescription = () => {
    return document.querySelector('meta[property="og:description"]')?.content || '';
};

const getMetaDescription = () => {
    return document.querySelector('meta[name="description"]')?.content || '';
};

const getOgImage = () => {
    return document.querySelector('meta[property="og:image"]')?.content || '';
};

const getTwitterImage = () => {
    return document.querySelector('meta[name="twitter:image"]')?.content || '';
};

const getFavicon = () => {
    const selectors = [
        'link[rel="icon"]',
        'link[rel="shortcut icon"]',
        'link[rel="apple-touch-icon"]'
    ];
    for (const selector of selectors) {
        const faviconLink = document.querySelector(selector);
        if (faviconLink?.href) {
            return faviconLink.href;
        }
    }
    return '';
};

const getOgSiteName = () => {
    return document.querySelector('meta[property="og:site_name"]')?.content || '';
};

const getApplicationName = () => {
    return document.querySelector('meta[name="application-name"]')?.content || '';
};

const getMetaAuthor = () => {
    const author = document.querySelector('meta[name="author"]')?.content || '';
    if (author && !/^https?:\/\//i.test(author)) {
        return author;
    }
    return '';
};

const getTwitterCreator = () => {
    return document.querySelector('meta[name="twitter:creator"]')?.content || '';
};

const getShareUrl = () => {
    return getCanonicalUrl() || window.location.href;
};

const getShareTitle = () => {
    return getOgTitle() || document.title || '';
};

const getShareExcerpt = () => {
    return getOgDescription() || getMetaDescription() || '';
};

const getShareImage = () => {
    return getOgImage() || getTwitterImage() || '';
};

const getShareFavicon = () => {
    return getFavicon() || '';
};

const getShareSiteName = ({shareUrl}) => {
    const siteName = getOgSiteName() || getApplicationName() || '';
    if (siteName) {
        return siteName;
    }

    try {
        return new URL(shareUrl).hostname.replace(/^www\./, '');
    } catch (_) {
        return '';
    }
};

const getShareAuthor = () => {
    return getMetaAuthor() || getTwitterCreator() || '';
};

const createShareLink = (baseUrl, params) => {
    const search = new URLSearchParams(params);
    return `${baseUrl}?${search.toString()}`;
};

const createEmailShareLink = ({shareTitle, shareUrl}) => {
    const body = [shareTitle, shareUrl].filter(Boolean).join('\n\n');
    const params = [];

    if (shareTitle) {
        params.push(`subject=${encodeURIComponent(shareTitle)}`);
    }

    if (body) {
        params.push(`body=${encodeURIComponent(body)}`);
    }

    return `mailto:${params.length ? `?${params.join('&')}` : ''}`;
};

const ShareModal = () => {
    const [copied, setCopied] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const copyTimeoutRef = useRef();
    const moreMenuRef = useRef(null);

    const shareUrl = useMemo(() => getShareUrl(), []);
    const shareTitle = useMemo(() => getShareTitle(), []);
    const shareExcerpt = useMemo(() => getShareExcerpt(), []);
    const shareImage = useMemo(() => getShareImage(), []);
    const shareFavicon = useMemo(() => getShareFavicon(), []);
    const shareSiteName = useMemo(() => getShareSiteName({shareUrl}), [shareUrl]);
    const shareAuthor = useMemo(() => getShareAuthor(), []);

    const socialLinks = useMemo(() => {
        const threadsText = [shareTitle, shareUrl].filter(Boolean).join(' ').trim();

        return {
            twitter: createShareLink('https://twitter.com/intent/tweet', {url: shareUrl, text: shareTitle}),
            facebook: createShareLink('https://www.facebook.com/sharer/sharer.php', {u: shareUrl}),
            email: createEmailShareLink({shareTitle, shareUrl}),
            threads: createShareLink('https://www.threads.net/intent/post', {text: threadsText}),
            linkedin: createShareLink('https://www.linkedin.com/sharing/share-offsite/', {url: shareUrl}),
            bluesky: createShareLink('https://bsky.app/intent/compose', {text: threadsText})
        };
    }, [shareTitle, shareUrl]);

    useEffect(() => {
        return () => {
            clearTimeout(copyTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isMoreMenuOpen) {
            return;
        }

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

        document.addEventListener('mousedown', onDocumentMouseDown);
        document.addEventListener('keydown', onDocumentKeyDown);

        return () => {
            document.removeEventListener('mousedown', onDocumentMouseDown);
            document.removeEventListener('keydown', onDocumentKeyDown);
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

    const onModalBodyClick = (event) => {
        if (!isMoreMenuOpen) {
            return;
        }

        if (moreMenuRef.current?.contains(event.target)) {
            return;
        }

        setIsMoreMenuOpen(false);
    };

    return (
        <div className='gh-portal-content gh-portal-share' onClick={onModalBodyClick}>
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
                                {shareAuthor && (
                                    <span className='gh-portal-share-preview-author'>
                                        {shareSiteName ? `| ${shareAuthor}` : shareAuthor}
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
                    className='gh-portal-btn gh-portal-share-action facebook'
                    href={socialLinks.facebook}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={t('Facebook')}
                    title={t('Facebook')}
                >
                    <span className='gh-portal-share-icon' aria-hidden='true'>
                        <FacebookIcon />
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
                                href={socialLinks.linkedin}
                                target='_blank'
                                rel='noopener noreferrer'
                                role='menuitem'
                                onClick={onClickMoreItem}
                            >
                                <span className='gh-portal-share-more-item-icon' aria-hidden='true'>
                                    <LinkedinIcon />
                                </span>
                                <span>{t('LinkedIn')}</span>
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
