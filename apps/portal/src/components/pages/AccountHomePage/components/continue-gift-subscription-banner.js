import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import {getSubscriptionExpiry, isGiftMember} from '../../../../utils/helpers';
import {useContext} from 'react';

const ContinueGiftSubscriptionBanner = () => {
    const {member, doAction, action, brandColor} = useContext(AppContext);

    if (!isGiftMember({member})) {
        return null;
    }

    const expiryDate = getSubscriptionExpiry({member});
    if (!expiryDate) {
        return null;
    }

    const isRunning = ['continueGiftSubscription:running'].includes(action);

    // TODO: Add translation strings once copy has been finalised
    /* eslint-disable i18next/no-literal-string */
    return (
        <div className='gh-portal-cancelcontinue-container'>
            <div className='gh-portal-cancel-banner'>
                <p style={{maxWidth: 'none', margin: '0 0 16px', textAlign: 'center'}}>
                    Your gift subscription ends on <strong>{expiryDate}</strong>. Continue with a paid subscription to keep reading. Any remaining days will be added as free trial time.
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
