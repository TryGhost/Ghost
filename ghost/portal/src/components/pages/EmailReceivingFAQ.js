import AppContext from 'AppContext';
import {useContext} from 'react';
import BackButton from 'components/common/BackButton';
import CloseButton from 'components/common/CloseButton';
import {getDefaultNewsletterSender, getSupportAddress} from 'utils/helpers';

export default function EmailReceivingPage() {
    const {brandColor, onAction, site, lastPage, member} = useContext(AppContext);

    const supportAddressEmail = getSupportAddress({site});
    const supportAddress = `mailto:${supportAddressEmail}`;
    const defaultNewsletterSenderEmail = getDefaultNewsletterSender({site});
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
                <h3>Help! I'm not receiving emails</h3>

                <p>If you're not receiving the email newsletter you've subscribed to, here are few things to check.</p>

                <h4>Verify your email address is correct</h4>

                <p>The email address we have for you is <strong>{member.email}</strong> &mdash; if that's not correct, you can update it in your <button className="gh-portal-btn-text" onClick={() => onAction('switchPage', {lastPage: 'emailReceivingFAQ', page: 'accountProfile'})}>account settings area</button>.</p>

                <h4>Check spam & promotions folders</h4>

                <p>Make sure emails aren't accidentally ending up in the Spam or Promotions folders of your inbox. If they are, click on "Mark as not spam" and/or "Move to inbox".</p>

                <h4>Create a new contact</h4>

                <p>In your email client add <strong>{defaultNewsletterSenderEmail}</strong> to your contacts list. This signals to your mail provider that emails sent from this address should be trusted.</p>

                <h4>Send an email and say hi!</h4>

                <p>Send an email to <strong>{defaultNewsletterSenderEmail}</strong> and say hello. This can also help signal to your mail provider that emails to-and-from this address should be trusted.</p>

                <h4>Check with your mail provider</h4>

                <p>If you have a corporate or government email account, reach out to your IT department and ask them to allow emails to be received from <strong>{defaultNewsletterSenderEmail}</strong></p>

                <h4>Get in touch for help</h4>

                <p>If you've completed all these checks and you're still not receiving emails, you can reach out to get support by contacting <a href={supportAddress} onClick={() => {
                    supportAddress && window.open(supportAddress);
                }}>{supportAddressEmail}</a>.</p>
            </div>
        </div>
    );
}
