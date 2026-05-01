import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import {getSubscriptionExpiry, isArchivedTier, isGiftMember} from '../../../../utils/helpers';
import {useContext} from 'react';

const ContinueGiftSubscriptionBanner = () => {
    const {member, site, doAction, action, brandColor} = useContext(AppContext);

    if (!isGiftMember({member}) || isArchivedTier({member, site})) {
        return null;
    }

    const expiryDate = getSubscriptionExpiry({member});
    if (!expiryDate) {
        return null;
    }

    const isRunning = action === 'continueGiftSubscription:running';

    // TODO: Add translation strings once copy has been finalised
    /* eslint-disable i18next/no-literal-string */
    return (
        <div className='gh-portal-cancelcontinue-container'>
            <div className='gh-portal-cancel-banner'>
                <p style={{maxWidth: 'none', margin: '0 0 16px', textAlign: 'center', textWrap: 'pretty'}}>
                    Continue with a paid subscription anytime. Your remaining gift period will be added as a free trial.
                </p>
                <ActionButton
                    onClick={() => doAction('continueGiftSubscription')}
                    isRunning={isRunning}
                    disabled={isRunning}
                    isPrimary={true}
                    brandColor={brandColor}
                    label='Continue subscription'
                    style={{
                        width: '100%'
                    }}
                />
            </div>
        </div>
    );
};

export default ContinueGiftSubscriptionBanner;
