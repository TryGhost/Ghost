import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import {getSubscriptionExpiry, isArchivedTier, isGiftMember, arePaidMembersEnabled} from '../../../../utils/helpers';
import {t} from '../../../../utils/i18n';
import {useContext} from 'react';

const ContinueGiftSubscriptionBanner = () => {
    const {member, site, doAction, action, brandColor} = useContext(AppContext);

    const canContinueGiftSubscription = isGiftMember({member}) && !isArchivedTier({member, site}) && arePaidMembersEnabled({site});
    if (!canContinueGiftSubscription) {
        return null;
    }

    const expiryDate = getSubscriptionExpiry({member});
    if (!expiryDate) {
        return null;
    }

    const isRunning = action === 'continueGiftSubscription:running';

    return (
        <div className='gh-portal-cancelcontinue-container'>
            <div className='gh-portal-cancel-banner'>
                <p style={{maxWidth: 'none', margin: '0 0 16px', textAlign: 'center', textWrap: 'pretty'}}>
                    {t('Enjoying your gift? Continue as a paid member anytime — you won\'t be charged until your gift runs out.')}
                </p>
                <ActionButton
                    onClick={() => doAction('continueGiftSubscription')}
                    isRunning={isRunning}
                    disabled={isRunning}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={t('Continue subscription')}
                    style={{
                        width: '100%'
                    }}
                />
            </div>
        </div>
    );
};

export default ContinueGiftSubscriptionBanner;
