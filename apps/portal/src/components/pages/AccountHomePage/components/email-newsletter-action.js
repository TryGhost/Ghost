import AppContext from '../../../../app-context';
import Switch from '../../../common/switch';
import {getSiteNewsletters, hasMemberGotEmailSuppression} from '../../../../utils/helpers';
import {useContext} from 'react';
import {t} from '../../../../utils/i18n';

function EmailNewsletterAction() {
    const {member, site, doAction} = useContext(AppContext);
    let {newsletters} = member;

    const subscribed = !!newsletters?.length;
    let label = subscribed ? t('Subscribed') : t('Unsubscribed');
    const onToggleSubscription = () => {
        const siteNewsletters = getSiteNewsletters({site});
        const subscribedNewsletters = !member?.newsletters?.length ? siteNewsletters : [];
        doAction('updateNewsletterPreference', {newsletters: subscribedNewsletters});
    };

    return (
        <section
            className='gh-portal-list-clickable'
            role="button"
            tabIndex={0}
            aria-pressed={subscribed}
            onClick={onToggleSubscription}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleSubscription();
                }
            }}
        >
            <div className='gh-portal-list-detail email-newsletter'>
                <h3>{t('Email newsletter')}</h3>
                <p>{label} {hasMemberGotEmailSuppression({member}) && subscribed && <button
                    className='gh-portal-btn-text gh-email-faq-page-button'
                    onClick={(e) => {
                        e.stopPropagation();
                        doAction('switchPage', {page: 'emailReceivingFAQ', lastPage: 'accountHome'});
                    }}
                >
                    {t('Not receiving emails?')}
                </button>}</p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
                <Switch
                    dataTestId="default-newsletter-toggle"
                    id="default-newsletter-toggle"
                    label={t('Email newsletter')}
                    onToggle={(e) => {
                        onToggleSubscription(e, subscribed);
                    }} checked={subscribed}
                    presentational={true}
                />
            </div>
        </section>
    );
}

export default EmailNewsletterAction;
