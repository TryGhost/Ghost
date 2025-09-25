import AppContext from '../../../../AppContext';
import {useContext, useState} from 'react';

const RSSFeedAction = () => {
    const {member, site, api, t} = useContext(AppContext);
    const [rssUrl, setRssUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleRSSClick = async (e) => {
        e.preventDefault();

        if (rssUrl) {
            // Copy to clipboard
            try {
                await navigator.clipboard.writeText(rssUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = rssUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await api.member.generateRssToken();
            if (response && response.rss_url) {
                setRssUrl(response.rss_url);
                // Auto-copy on first generation
                try {
                    await navigator.clipboard.writeText(response.rss_url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                } catch (err) {
                    // Silent fail if clipboard not available
                }
            }
        } catch (error) {
            console.error('Failed to get RSS URL:', error);
        } finally {
            setLoading(false);
        }
    };

    // Only show RSS option if site has RSS enabled
    if (!site || site.rss === false) {
        return null;
    }

    const buttonText = loading ? t('Loading...') :
                      rssUrl ? (copied ? t('Copied!') : t('Copy RSS URL')) :
                      t('Get RSS URL');

    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>{t('RSS Feed')}</h3>
                <p>
                    {rssUrl ? (
                        <span style={{fontSize: '14px', color: '#738a94'}}>
                            {copied ? t('RSS URL copied to clipboard!') : t('Click to copy your personal RSS feed URL')}
                        </span>
                    ) : (
                        t('Access your personal RSS feed')
                    )}
                </p>
            </div>
            <button
                className='gh-portal-btn gh-portal-btn-list'
                onClick={handleRSSClick}
                disabled={loading}
                data-test-button='rss-feed-button'
                style={{
                    opacity: loading ? 0.5 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {buttonText}
            </button>
        </section>
    );
};

export default RSSFeedAction;