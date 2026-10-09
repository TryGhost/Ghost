import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import {
  getSubscriptionExpiry,
  isArchivedTier,
  isGiftMember,
  arePaidMembersEnabled,
} from '../../../../utils/helpers';
import { t } from '../../../../utils/i18n';
import { useContext } from 'react';

const ContinueGiftSubscriptionBanner = () => {
  const { member, site, doAction, action, brandColor } = useContext(AppContext);

  const canContinueGiftSubscription =
    isGiftMember({ member }) &&
    !isArchivedTier({ member, site }) &&
    arePaidMembersEnabled({ site });
  if (!canContinueGiftSubscription) {
    return null;
  }

  const expiryDate = getSubscriptionExpiry({ member });
  if (!expiryDate) {
    return null;
  }

  const isRunning = action === 'continueGiftSubscription:running';

  return (
    <div className="gh-portal-cancelcontinue-container mx-0 mt-6 mb-8">
      <div className="gh-portal-cancel-banner relative mb-4 rounded-lg p-4 text-center text-14 leading-normal text-gray-950 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:block before:rounded-lg before:bg-brand before:opacity-5 before:content-[''] [&_p]:mx-auto [&_p]:mt-0 [&_p]:mb-4 [&_p]:max-w-[320px] [&>*]:relative [&>*]:z-[1]">
        <p
          style={{ maxWidth: 'none', margin: '0 0 16px', textAlign: 'center', textWrap: 'pretty' }}
        >
          {t(
            'Continue with a paid subscription anytime. Your remaining gift period will be added as a free trial.',
          )}
        </p>
        <ActionButton
          onClick={() => doAction('continueGiftSubscription')}
          isRunning={isRunning}
          disabled={isRunning}
          isPrimary={true}
          brandColor={brandColor}
          label={t('Continue subscription')}
          style={{
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default ContinueGiftSubscriptionBanner;
