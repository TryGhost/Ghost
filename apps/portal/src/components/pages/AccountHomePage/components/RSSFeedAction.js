import AppContext from '../../../../AppContext';
import {useContext, useState} from 'react';

function RSSFeedAction() {
    const {member, t} = useContext(AppContext);
    const [copied, setCopied] = useState(false);

    console.log('[RSSFeedAction] Component loaded, member:', member?.email, 'RSS URL:', member?.rss_url);

    if (!member?.rss_url) {
        console.log('[RSSFeedAction] No RSS URL, not rendering component');
        return null;
    }

    console.log('[RSSFeedAction] Rendering RSS component');

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(member.rss_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = member.rss_url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (copyErr) {
                console.error('Failed to copy RSS URL:', copyErr);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <section>
            <div className="gh-portal-list-detail">
                <h3>{t('RSS Feed') || 'RSS Feed'}</h3>
                <p>{t('Your personal RSS feed URL for news readers') || 'Your personal RSS feed URL for news readers'}</p>
            </div>
            <button
                className="gh-portal-btn gh-portal-btn-list"
                onClick={copyToClipboard}
                data-test-button="copy-rss-url"
                disabled={copied}
            >
                {copied ? (t('Copied!') || 'Copied!') : (t('Copy URL') || 'Copy URL')}
            </button>
        </section>
    );
}

export default RSSFeedAction;