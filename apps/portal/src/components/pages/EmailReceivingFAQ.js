import AppContext from '../../AppContext';
import {useContext} from 'react';
import BackButton from '../../components/common/BackButton';
import CloseButton from '../../components/common/CloseButton';
import {getDefaultNewsletterSender, getSupportAddress} from '../../utils/helpers';
import Interpolate from '@doist/react-interpolate';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';

export default function EmailReceivingPage() {
    const {brandColor, onAction, site, lastPage, member, t, pageData} = useContext(AppContext);

    const supportAddressEmail = getSupportAddress({site});
    const supportAddress = `mailto:${supportAddressEmail}`;
    const defaultNewsletterSenderEmail = getDefaultNewsletterSender({site});
    const directAccess = (pageData && pageData.direct) || false;

    return (
        <div className="gh-email-receiving-faq">
            <header className='gh-portal-detail-header'>
                {!directAccess &&
                    <BackButton brandColor={brandColor} onClick={() => {
                        if (!lastPage) {
                            onAction('switchPage', {page: 'accountEmail', lastPage: 'accountHome'});
                        } else {
                            onAction('switchPage', {page: 'accountHome'});
                        }
                    }} />
                }
                <CloseButton />
            </header>

            <div className="gh-longform">
                <h3>{t(`Help! I'm not receiving emails`)}</h3>

                <p>{t(`If you're not receiving the email newsletter you've subscribed to, here are a few things to check.`)}</p>

                <h4>{t(`Verify your email address is correct`)}</h4>

                <p>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t(`The email address we have for you is {{memberEmail}} — if that's not correct, you can update it in your <button>account settings area</button>.`)}
                        mapping={{
                            memberEmail: <strong>{member.email}</strong>,
                            button: <button className="gh-portal-btn-text" onClick={() => onAction('switchPage', {lastPage: 'emailReceivingFAQ', page: 'accountProfile'})}/>
                        }}
                    />
                </p>

                <h4>{t(`Check spam & promotions folders`)}</h4>

                <p>{t(`Make sure emails aren't accidentally ending up in the Spam or Promotions folders of your inbox. If they are, click on "Mark as not spam" and/or "Move to inbox".`)}</p>

                <h4>{t(`Create a new contact`)}</h4>

                <p>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t(`In your email client add {{senderEmail}} to your contacts list. This signals to your mail provider that emails sent from this address should be trusted.`)}
                        mapping={{
                            senderEmail: <strong>{defaultNewsletterSenderEmail}</strong>
                        }}
                    />
                </p>

                <h4>{t(`Send an email and say hi!`)}</h4>

                <p>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t(`Send an email to {{senderEmail}} and say hello. This can also help signal to your mail provider that emails to and from this address should be trusted.`)}
                        mapping={{
                            senderEmail: <strong>{defaultNewsletterSenderEmail}</strong>
                        }}
                    />
                </p>

                <h4>{t(`Check with your mail provider`)}</h4>

                <p>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t(`If you have a corporate or government email account, reach out to your IT department and ask them to allow emails to be received from {{senderEmail}}`)}
                        mapping={{
                            senderEmail: <strong>{defaultNewsletterSenderEmail}</strong>
                        }}
                    />
                </p>

                <h4>{t(`Get in touch for help`)}</h4>

                <p>
                    <Interpolate
                        syntax={SYNTAX_I18NEXT}
                        string={t(`If you've completed all these checks and you're still not receiving emails, you can reach out to get support by contacting {{supportAddress}}.`)}
                        mapping={{
                            supportAddress: <a href={supportAddress} onClick={() => {
                                supportAddress && window.open(supportAddress);
                            }}>{supportAddressEmail}</a>
                        }}
                    />
                </p>
            </div>
        </div>
    );
}
