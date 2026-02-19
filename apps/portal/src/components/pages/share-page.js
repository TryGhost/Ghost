import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {ReactComponent as FacebookIcon} from '../../images/icons/share-facebook.svg';
import {ReactComponent as LinkIcon} from '../../images/icons/share-link.svg';
import {ReactComponent as LinkedinIcon} from '../../images/icons/share-linkedin.svg';
import {ReactComponent as XIcon} from '../../images/icons/share-x.svg';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {t} from '../../utils/i18n';

export const SharePageStyles = `
    .gh-portal-share-header {
        margin-bottom: 14px;
    }

    .gh-portal-share-header .gh-portal-main-title {
        text-align: left;
        font-size: 2.4rem;
        font-weight: 600;
    }
    html[dir="rtl"] .gh-portal-share-header .gh-portal-main-title {
        text-align: right;
    }

    .gh-portal-share-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin-top: 14px;
    }

    .gh-portal-share-preview {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .gh-portal-share-preview-image {
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 8px;
        object-fit: cover;
        background: var(--grey14);
    }

    .gh-portal-share-preview-title {
        margin: 0;
        color: var(--grey0);
        font-size: 1.65rem;
        font-weight: 600;
        line-height: 1.35;
        text-wrap: pretty;
    }

    .gh-portal-share-preview-excerpt {
        margin: -2px 0 0;
        color: var(--grey6);
        font-size: 1.4rem;
        line-height: 1.45;
        text-wrap: pretty;
        margin-top: -8px;
    }

    .gh-portal-share-action {
        height: 54px;
        min-width: 0;
        padding: 0;
        border-radius: 8px;
        border: 1px solid var(--grey12);
        background: var(--white);
        color: var(--grey2);
    }

    .gh-portal-share-action:hover {
        border-color: var(--grey10);
    }

    .gh-portal-share-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        line-height: 0;
        color: var(--grey2);
    }

    .gh-portal-share-icon svg {
        width: 20px;
        height: 20px;
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

const getShareUrl = (pageData) => {
    return (pageData?.url || '').trim() || getCanonicalUrl() || window.location.href;
};

const getShareTitle = (pageData) => {
    return (pageData?.title || '').trim() || getOgTitle() || document.title || '';
};

const getShareExcerpt = (pageData) => {
    return (pageData?.excerpt || '').trim() || getOgDescription() || getMetaDescription() || '';
};

const getShareImage = (pageData) => {
    return (pageData?.image || '').trim() || getOgImage() || getTwitterImage() || '';
};

const createShareLink = (baseUrl, params) => {
    const search = new URLSearchParams(params);
    return `${baseUrl}?${search.toString()}`;
};

const SharePage = () => {
    const {pageData} = useContext(AppContext);
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef();

    const shareUrl = useMemo(() => getShareUrl(pageData), [pageData]);
    const shareTitle = useMemo(() => getShareTitle(pageData), [pageData]);
    const shareExcerpt = useMemo(() => getShareExcerpt(pageData), [pageData]);
    const shareImage = useMemo(() => getShareImage(pageData), [pageData]);

    const socialLinks = useMemo(() => {
        return {
            twitter: createShareLink('https://twitter.com/intent/tweet', {url: shareUrl, text: shareTitle}),
            facebook: createShareLink('https://www.facebook.com/sharer/sharer.php', {u: shareUrl}),
            linkedin: createShareLink('https://www.linkedin.com/sharing/share-offsite/', {url: shareUrl})
        };
    }, [shareTitle, shareUrl]);

    useEffect(() => {
        return () => {
            clearTimeout(copyTimeoutRef.current);
        };
    }, []);

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

    return (
        <div className='gh-portal-content gh-portal-share'>
            <CloseButton />
            <div className='gh-portal-share-header'>
                <h1 className='gh-portal-main-title'>{t('Share')}</h1>
            </div>

            <div className='gh-portal-share-preview'>
                {shareImage && <img className='gh-portal-share-preview-image' src={shareImage} alt='' data-testid='share-preview-image' />}
                {shareTitle && <h2 className='gh-portal-share-preview-title'>{shareTitle}</h2>}
                {shareExcerpt && <p className='gh-portal-share-preview-excerpt'>{shareExcerpt}</p>}
            </div>

            <div className='gh-portal-share-actions'>
                <a
                    className='gh-portal-btn gh-portal-share-action'
                    href={socialLinks.twitter}
                    target='_blank'
                    rel='noopener noreferrer'
                    aria-label={t('X (Twitter)')}
                    title={t('X (Twitter)')}
                >
                    <span className='gh-portal-share-icon' aria-hidden='true'>
                        <XIcon />
                    </span>
                </a>

                <a
                    className='gh-portal-btn gh-portal-share-action'
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

                <a
                    className='gh-portal-btn gh-portal-share-action'
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

                <button
                    className='gh-portal-btn gh-portal-share-action'
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
                </button>
            </div>
        </div>
    );
};

export default SharePage;
