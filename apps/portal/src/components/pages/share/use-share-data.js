import {useState} from 'react';

const getHostWindow = () => {
    try {
        if (window.parent && window.parent !== window && window.parent.location.href) {
            return window.parent;
        }
    } catch {
        // Cross-origin frame detected; fall back to iframe context
    }

    return window;
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

    const query = params.length ? `?${params.join('&')}` : '';
    return `mailto:${query}`;
};

const createLinkedinShareLink = ({shareTitle, shareUrl}) => {
    return createShareLink('https://www.linkedin.com/shareArticle', {
        mini: 'true',
        url: shareUrl,
        title: shareTitle
    });
};

const gatherShareData = () => {
    const hostWindow = getHostWindow();
    const doc = hostWindow.document;
    const loc = hostWindow.location;

    // helper to reduce some repetition of querySelector
    const q = (selector, attr = 'content') => doc.querySelector(selector)?.[attr] || '';

    const shareUrl = q('link[rel="canonical"]', 'href') || (loc.origin + loc.pathname + loc.search);
    const shareTitle = q('meta[property="og:title"]') || doc.title || '';
    const shareExcerpt = q('meta[property="og:description"]') || q('meta[name="description"]') || '';
    const shareImage = q('meta[property="og:image"]') || q('meta[name="twitter:image"]') || '';
    const shareFavicon = q('link[rel="icon"]', 'href') || q('link[rel="shortcut icon"]', 'href') || q('link[rel="apple-touch-icon"]', 'href');

    const rawAuthor = q('meta[name="author"]');
    const shareAuthor = (rawAuthor && !/^https?:\/\//i.test(rawAuthor) ? rawAuthor : '') || q('meta[name="twitter:creator"]') || '';

    let shareSiteName = q('meta[property="og:site_name"]') || q('meta[name="application-name"]') || '';
    if (!shareSiteName) {
        try {
            shareSiteName = new URL(shareUrl).hostname.replace(/^www\./, '');
        } catch {
            shareSiteName = '';
        }
    }

    const threadsText = [shareTitle, shareUrl].filter(Boolean).join(' ').trim();
    const socialLinks = {
        twitter: createShareLink('https://twitter.com/intent/tweet', {url: shareUrl, text: shareTitle}),
        facebook: createShareLink('https://www.facebook.com/sharer/sharer.php', {u: shareUrl}),
        email: createEmailShareLink({shareTitle, shareUrl}),
        threads: createShareLink('https://www.threads.net/intent/post', {text: threadsText}),
        linkedin: createLinkedinShareLink({shareTitle, shareUrl}),
        bluesky: createShareLink('https://bsky.app/intent/compose', {text: threadsText})
    };

    return {shareUrl, shareTitle, shareExcerpt, shareImage, shareFavicon, shareSiteName, shareAuthor, socialLinks};
};

const useShareData = () => {
    const [data] = useState(gatherShareData);
    return data;
};

export default useShareData;
