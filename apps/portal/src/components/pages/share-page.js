import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {t} from '../../utils/i18n';

export const SharePageStyles = `
    .gh-portal-share-header {
        margin-bottom: 20px;
    }

    .gh-portal-share-subtitle {
        margin: 8px 0 0;
        color: var(--grey6);
    }

    .gh-portal-share-item .gh-portal-list-detail p {
        margin-top: 4px;
    }

    .gh-portal-share-item .gh-portal-btn-list {
        height: 32px;
        margin-inline-start: 12px;
    }
`;

const getCanonicalUrl = () => {
    return document.querySelector('link[rel="canonical"]')?.href || '';
};

const getOgTitle = () => {
    return document.querySelector('meta[property="og:title"]')?.content || '';
};

const getShareUrl = (pageData) => {
    return (pageData?.url || '').trim() || getCanonicalUrl() || window.location.href;
};

const getShareTitle = (pageData) => {
    return (pageData?.title || '').trim() || getOgTitle() || document.title || '';
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
            <div className='gh-portal-signup-header gh-portal-share-header'>
                <h1 className='gh-portal-main-title'>{t('Share')}</h1>
                <p className='gh-portal-text-center gh-portal-share-subtitle'>{t('Share this post')}</p>
            </div>

            <div className='gh-portal-list'>
                <section className='gh-portal-share-item'>
                    <div className='gh-portal-list-detail'>
                        <h3>{t('X (Twitter)')}</h3>
                    </div>
                    <a className='gh-portal-btn gh-portal-btn-list' href={socialLinks.twitter} target='_blank' rel='noopener noreferrer'>
                        {t('X (Twitter)')}
                    </a>
                </section>

                <section className='gh-portal-share-item'>
                    <div className='gh-portal-list-detail'>
                        <h3>{t('Facebook')}</h3>
                    </div>
                    <a className='gh-portal-btn gh-portal-btn-list' href={socialLinks.facebook} target='_blank' rel='noopener noreferrer'>
                        {t('Facebook')}
                    </a>
                </section>

                <section className='gh-portal-share-item'>
                    <div className='gh-portal-list-detail'>
                        <h3>{t('LinkedIn')}</h3>
                    </div>
                    <a className='gh-portal-btn gh-portal-btn-list' href={socialLinks.linkedin} target='_blank' rel='noopener noreferrer'>
                        {t('LinkedIn')}
                    </a>
                </section>

                <section className='gh-portal-share-item'>
                    <div className='gh-portal-list-detail'>
                        <h3>{t('Copy link')}</h3>
                        <p>{shareUrl}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' type='button' onClick={onCopy}>
                        {copied ? t('Copied') : t('Copy link')}
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SharePage;
