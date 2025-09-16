import AppContext from '../../../../AppContext';
import {useContext, useState} from 'react';
import ActionButton from '../../../../components/common/ActionButton';

const RSSFeedAction = () => {
    const {member, site, api, t} = useContext(AppContext);
    const [rssUrl, setRssUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const getRSSUrl = async () => {
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

    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>{t('RSS Feed')}</h3>
                <p>
                    {rssUrl ? (
                        <span className='gh-portal-rss-url'>
                            {copied ? t('Copied!') : t('Click to copy your personal RSS feed URL')}
                        </span>
                    ) : (
                        t('Get your personal RSS feed URL')
                    )}
                </p>
            </div>
            <ActionButton
                dataTestId='rss-feed-button'
                isRunning={loading}
                onClick={getRSSUrl}
                disabled={loading}
                classes='gh-portal-btn gh-portal-btn-list'
            >
                {rssUrl ? (copied ? t('Copied!') : t('Copy URL')) : t('Get RSS URL')}
            </ActionButton>
        </section>
    );
};

export default RSSFeedAction;