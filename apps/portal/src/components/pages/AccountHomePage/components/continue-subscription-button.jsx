import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import Interpolate from '@doist/react-interpolate';
import { getMemberSubscription } from '../../../../utils/helpers';
import { getDateString } from '../../../../utils/date-time';
import { useContext } from 'react';
import { t } from '../../../../utils/i18n';

const ContinueSubscriptionButton = () => {
  const { member, doAction, action, brandColor } = useContext(AppContext);
  const subscription = getMemberSubscription({ member });
  if (!subscription) {
    return null;
  }

  // To show only continue button and not cancellation
  if (!subscription.cancel_at_period_end) {
    return null;
  }
  const label = t('Resume subscription');
  const isRunning = ['continueSubscription:running'].includes(action);
  const disabled = isRunning ? true : false;
  const expiryDate = getDateString(subscription.current_period_end);

  return (
    <div className="gh-portal-cancelcontinue-container mx-0 mb-8 mt-6">
      <div className="gh-portal-cancel-banner relative mb-4 rounded-lg p-4 text-center text-md leading-normal text-gray-950 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:block before:rounded-lg before:bg-brand before:opacity-5 before:content-[''] [&>*]:relative [&>*]:z-[1] [&_p]:mx-auto [&_p]:mb-4 [&_p]:mt-0 [&_p]:max-w-[320px]">
        <p>
          <Interpolate
            string={t('Your subscription has been canceled and will expire on {expiryDate}.')}
            mapping={{
              expiryDate: <strong>{expiryDate}</strong>,
            }}
          />
        </p>
        <ActionButton
          onClick={() => {
            doAction('continueSubscription', {
              subscriptionId: subscription.id,
            });
          }}
          isRunning={isRunning}
          disabled={disabled}
          isPrimary={true}
          brandColor={brandColor}
          label={label}
          style={{
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};

export default ContinueSubscriptionButton;
