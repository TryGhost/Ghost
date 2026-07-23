import AppContext from '../../../../app-context';
import {useContext} from 'react';
import {areGiftSubscriptionsEnabled, getAvailableProducts, isGiftMember, isPaidMember} from '../../../../utils/helpers';
import {t} from '../../../../utils/i18n';

function GiveGiftAction() {
    const {member, site, doAction} = useContext(AppContext);

    // Only offered to members who already pay (or are comped): free members see
    // their own upgrade CTA instead, and gift recipients see the continue flow.
    if (!areGiftSubscriptionsEnabled({site}) || !isPaidMember({member}) || isGiftMember({member})) {
        return null;
    }

    // The gift page dead-ends when no paid tiers are purchasable (e.g. all
    // archived or hidden), so don't offer a row that leads nowhere.
    const hasGiftableProducts = getAvailableProducts({site}).some(product => product.type === 'paid');
    if (!hasGiftableProducts) {
        return null;
    }

    const handleClick = () => {
        doAction('switchPage', {
            page: 'gift',
            lastPage: 'accountHome'
        });
    };

    return (
        <section
            className="gh-portal-list-clickable"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div className="gh-portal-list-detail">
                <h3>{t('Gift a membership')}</h3>
                <p>{t('Buy a membership for someone else')}</p>
            </div>
            <span
                className="gh-portal-list-action"
                data-test-button="give-gift-subscription"
                aria-hidden="true"
            >
                {t('Gift')}
            </span>
        </section>
    );
}

export default GiveGiftAction;
