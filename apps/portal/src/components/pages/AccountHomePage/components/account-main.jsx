import CloseButton from '../../../common/close-button';

import UserHeader from './user-header';
import AccountWelcome from './account-welcome';
import ContinueSubscriptionButton from './continue-subscription-button';
import ContinueGiftSubscriptionBanner from './continue-gift-subscription-banner';
import AccountActions from './account-actions';

const AccountMain = () => {
  return (
    <div className="gh-portal-content gh-portal-account-main relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <CloseButton />
      <UserHeader />
      <section className="gh-portal-account-data mb-10">
        <AccountWelcome />
        <ContinueGiftSubscriptionBanner />
        <ContinueSubscriptionButton />
        <AccountActions />
      </section>
    </div>
  );
};

export default AccountMain;
