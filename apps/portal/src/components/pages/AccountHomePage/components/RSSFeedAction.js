import AppContext from '../../../../AppContext';
import {useContext, useState} from 'react';

function RSSFeedAction() {
    const {member, site, t} = useContext(AppContext);
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);

    // Check if member has RSS URL (this should be provided by the backend)
    const rssUrl = member?.rss_url;

    // If no RSS URL is available, don't render the component
    if (!rssUrl) {
        return null;
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(rssUrl);
            setCopied(true);
            setCopyError(false);
            // Reset the "copied" state after 3 seconds
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error('Failed to copy RSS URL: ', err);
            setCopyError(true);
            setTimeout(() => setCopyError(false), 3000);

            // Fallback for browsers that don't support clipboard API
            try {
                const textArea = document.createElement('textarea');
                textArea.value = rssUrl;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                setCopied(true);
                setCopyError(false);
                setTimeout(() => setCopied(false), 3000);
            } catch (fallbackErr) {
                console.error('Fallback copy failed: ', fallbackErr);
            }
        }
    };

    const getButtonText = () => {
        if (copied) {
            return t('Copied!');
        }
        if (copyError) {
            return t('Copy failed');
        }
        return t('Copy');
    };

    const getButtonClass = () => {
        let baseClass = 'gh-portal-btn gh-portal-btn-list';
        if (copied) {
            baseClass += ' gh-portal-btn-success';
        }
        if (copyError) {
            baseClass += ' gh-portal-btn-error';
        }
        return baseClass;
    };

    return (
        <section>
            <div className="gh-portal-list-detail">
                <h3>{t('RSS Feed')}</h3>
                <p>{t('Get your personal RSS feed with member content')}</p>
            </div>
            <button
                className={getButtonClass()}
                onClick={copyToClipboard}
                data-test-button="copy-rss-url"
                disabled={copied || copyError}
            >
                {getButtonText()}
            </button>
        </section>
    );
}

export default RSSFeedAction;