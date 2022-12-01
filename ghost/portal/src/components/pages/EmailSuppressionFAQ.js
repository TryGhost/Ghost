import AppContext from 'AppContext';
import {useContext} from 'react';
import BackButton from 'components/common/BackButton';
import CloseButton from 'components/common/CloseButton';
import {getSupportAddress} from 'utils/helpers';

export default function EmailSuppressedPage() {
    const {brandColor, onAction, site} = useContext(AppContext);

    const supportAddress = `mailto:${getSupportAddress({site})}`;

    return (
        <div className="gh-email-suppression-faq">
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={brandColor} onClick={() => {
                    onAction('switchPage', {page: 'emailSuppressed', lastPage: 'accountHome'});
                }} />
                <CloseButton />
            </header>

            <div class="gh-longform">
                <h3>Why has my email been disabled?</h3>
                <p>Newsletters can be disabled on your account for two reasons: A previous email was marked as spam, or attempting to send an email resulted in a permanent failure (bounce).</p>
                <h4>Spam complaints</h4>
                <p>If a newsletter is flagged as spam, emails are automatically disabled for that address to make sure you no longer receive any unwanted messages.</p>
                <p>If the spam complaint was accidental, or you would like to begin receiving emails again, you can resubscribe to emails by clicking the button on the previous screen.</p>
                <p>Once resubscribed, if you still don't see emails in your inbox, check your spam folder. Some inbox providers keep a record of previous spam complaints and will continue to flag emails. If this happens, mark the latest newsletter as 'Not spam' to move it back to your primary inbox.</p>
                <h4>Permanent failure (bounce)</h4>
                <p>When an inbox fails to accept an email it is commonly called a bounce. In many cases, this can be temporary. However, in some cases, a bounced email can be returned as a permanent failure when an email address is invalid or non-existent.</p>
                <p>In the event a permanent failure is received when attempting to send a newsletter, emails will be disabled on the account.</p>
                <p>If you would like to start receiving emails again, the best next steps are to check your email address on file for any issues and then click resubscribe on the previous screen.</p>
                <p><a className='gh-portal-btn gh-portal-btn-branded' href={supportAddress} onClick={() => {
                    supportAddress && window.open(supportAddress);
                }}>Need more help? Contact support</a></p>
            </div>
        </div>
    );
}
