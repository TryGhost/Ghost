import AppContext from 'AppContext';
import {useContext} from 'react';
import BackButton from 'components/common/BackButton';
import CloseButton from 'components/common/CloseButton';
import {getSupportAddress} from 'utils/helpers';

export default function EmailReceivingPage() {
    const {brandColor, onAction, site, lastPage} = useContext(AppContext);

    const supportAddress = `mailto:${getSupportAddress({site})}`;

    return (
        <div className="gh-email-receiving-faq">
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={brandColor} onClick={() => {
                    if (!lastPage) {
                        onAction('switchPage', {page: 'accountEmail', lastPage: 'accountHome'});
                    } else {
                        onAction('switchPage', {page: 'accountHome'});
                    }
                }} />
                <CloseButton />
            </header>

            <div class="gh-longform">
                <h3>Help! I'm not receiving subscription emails</h3>
                <p>If you're not receiving the newsletter, the first course of action is to check your account settings to ensure your email address is correct and your email preferences are set to subscribed.</p>
                <h4>Check the email on your account</h4>
                <p>If you need to correct a typo in your email address or change the email address associated with your membership, click <b>Edit</b> next to your address when viewing your account settings.</p>
                <p>Once saved, you'll need to confirm the change by clicking the confirmation link, which will arrive via email to your new email address's inbox.</p>
                <h4>Check spam & promotional folders</h4>
                <p>Once the email has been confirmed, the next course of action is to check your spam folder, and any promotional folders, set up by your mail provider.</p>
                <h5>Spam</h5>
                <p>If the newsletter landed in spam, you can mark the email as 'not spam' within your mail client — this should ensure that future newsletters arrive in your inbox going forward.</p>
                <h5>Promotional folder</h5>
                <p>If the newsletter arrived in your promotional folder, move the email to your main inbox. This should teach your mail client to place the newsletter in your primary inbox going forward.</p>
                <h5>Add to Contacts</h5>
                <p>To help avoid future emails arriving in spam or promotional folders, you can also add the newsletter 'From' email address to your contact list.</p>
                <h4>Check with your mail provider</h4>
                <p>For those with corporate-based email addresses, you may need to reach out to your help desk or IT department to troubleshoot any potential reasons that may prevent you from receiving email newsletters.</p>
                <p><a className='gh-portal-btn gh-portal-btn-branded' href={supportAddress} onClick={() => {
                    supportAddress && window.open(supportAddress);
                }}>Need more help? Contact support</a></p>
            </div>
        </div>
    );
}
