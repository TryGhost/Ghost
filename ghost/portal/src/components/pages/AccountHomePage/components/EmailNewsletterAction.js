import AppContext from 'AppContext';
import Switch from 'components/common/Switch';
import {getSiteNewsletters} from 'utils/helpers';
import {useContext} from 'react';

function EmailNewsletterAction() {
    const {member, site, onAction} = useContext(AppContext);
    let {newsletters} = member;

    const subscribed = !!newsletters?.length;
    let label = subscribed ? 'Subscribed' : 'Unsubscribed';
    const onToggleSubscription = (e, sub) => {
        e.preventDefault();
        const siteNewsletters = getSiteNewsletters({site});
        const subscribedNewsletters = !member?.newsletters?.length ? siteNewsletters : [];
        onAction('updateNewsletterPreference', {newsletters: subscribedNewsletters});
    };

    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>Email newsletter</h3>
                <p>{label}</p>
            </div>
            <div>
                <Switch
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
