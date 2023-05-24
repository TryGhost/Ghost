import AppContext from '../../../../AppContext';
import Switch from '../../../common/Switch';
import {getSiteNewsletters, hasMemberGotEmailSuppression} from '../../../../utils/helpers';
import {useContext} from 'react';

function EmailNewsletterAction() {
    const {member, site, onAction, t} = useContext(AppContext);
    let {newsletters} = member;

    const subscribed = !!newsletters?.length;
    let label = subscribed ? t('Subscribed') : t('Unsubscribed');
    const onToggleSubscription = (e, sub) => {
        e.preventDefault();
        const siteNewsletters = getSiteNewsletters({site});
        const subscribedNewsletters = !member?.newsletters?.length ? siteNewsletters : [];
        onAction('updateNewsletterPreference', {newsletters: subscribedNewsletters});
    };

    return (
        <section>
            <div className='gh-portal-list-detail email-newsletter'>
                <h3>{t('Email newsletter')}</h3>
                <p>{label} {hasMemberGotEmailSuppression({member}) && subscribed && <button
                    className='gh-portal-btn-text gh-email-faq-page-button'
                    onClick={() => onAction('switchPage', {page: 'emailReceivingFAQ', lastPage: 'accountHome'})}
                >
                    {t('Not receiving emails?')}
                </button>}</p>
            </div>
            <div>
                <Switch
                    dataTestId="default-newsletter-toggle"
                    id="default-newsletter-toggle"
                    onToggle={(e) => {
                        onToggleSubscription(e, subscribed);
                    }} checked={subscribed}
                />
            </div>
        </section>
    );
}

export default EmailNewsletterAction;
