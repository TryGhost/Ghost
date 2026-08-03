import AppContext from '../../../../app-context';
import {useContext} from 'react';
import {hasGiftableOffering, isAccountGiftOptionEnabled, isGiftMember, isPaidMember} from '../../../../utils/helpers';
import {t} from '../../../../utils/i18n';

// Only offered to members who already pay (or are comped): free members see
// their own upgrade CTA instead, and gift recipients see the continue flow.
// The offering check is because the gift page dead-ends when nothing is
// giftable (no giftable tier, or no offered duration) — don't offer an entry
// point that leads nowhere.
function canGiveGift({site, member}) {
    if (!isAccountGiftOptionEnabled({site}) || !isPaidMember({member}) || isGiftMember({member})) {
        return false;
    }
    return hasGiftableOffering({site});
}

// A card of its own below the account list rather than a row in it: the rows
// above are settings to manage, and this is the one thing on the screen
// that's an offer.
function GiveGiftCard() {
    const {member, site, doAction} = useContext(AppContext);

    if (!canGiveGift({site, member})) {
        return null;
    }

    const handleClick = () => {
        doAction('switchPage', {
            page: 'gift',
            lastPage: 'accountHome'
        });
    };

    return (
        <div className='gh-portal-list gh-portal-gift-card'>
            <section
                className='gh-portal-list-clickable'
                role='button'
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
                <div className='gh-portal-list-detail'>
                    <h3>{t('Gift membership')}</h3>
                    <p>{t('For a friend or colleague')}</p>
                </div>
                <span
                    className='gh-portal-list-action'
                    data-test-button='give-gift-subscription'
                    aria-hidden='true'
                >
                    {t('Buy')}
                </span>
            </section>
        </div>
    );
}

export default GiveGiftCard;
