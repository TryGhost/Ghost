import AppContext from '../../../../app-context';
import {useContext} from 'react';
import {isGiftMember, isPaidMember} from '../../../../utils/helpers';
import {canShowAccountGiftPromotion} from '../../../../utils/gift-subscriptions';
import {t} from '../../../../utils/i18n';

export function canGiveGift({site, member}) {
    return canShowAccountGiftPromotion({site})
        && isPaidMember({member})
        && !isGiftMember({member});
}

function GiveGiftCard() {
    const {member, site, doAction} = useContext(AppContext);

    if (!canGiveGift({site, member})) {
        return null;
    }

    const openGiftPage = () => {
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
                onClick={openGiftPage}
                onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) {
                        return;
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openGiftPage();
                    }
                }}
            >
                <div className='gh-portal-list-detail'>
                    <h3>{t('Gift membership')}</h3>
                    <p>{t('For a friend or colleague')}</p>
                </div>
                <span
                    aria-hidden='true'
                    className='gh-portal-list-action'
                    data-test-button='give-gift-subscription'
                >
                    {t('Buy')}
                </span>
            </section>
        </div>
    );
}

export default GiveGiftCard;
