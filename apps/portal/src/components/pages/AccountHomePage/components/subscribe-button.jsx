import AppContext from '../../../../app-context';
import ActionButton from '../../../common/action-button';
import { getAvailablePrices } from '../../../../utils/helpers';
import { useContext } from 'react';
import { t } from '../../../../utils/i18n';

const SubscribeButton = () => {
  const { site, action, brandColor, doAction } = useContext(AppContext);

  // upgrading isn't signing up, so members of invite-only and paid-only sites can upgrade too
  if (getAvailablePrices({ site }).length === 0) {
    return null;
  }
  const isRunning = ['checkoutPlan:running'].includes(action);

  const openPlanPage = () => {
    doAction('switchPage', {
      page: 'accountPlan',
      lastPage: 'accountHome',
    });
  };
  return (
    <ActionButton
      dataTestId={'view-plans'}
      isRunning={isRunning}
      label={t('View plans')}
      onClick={() => openPlanPage()}
      brandColor={brandColor}
      style={{ width: '100%' }}
    />
  );
};

export default SubscribeButton;
