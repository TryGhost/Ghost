import CloseButton from '../../../common/close-button';

import UserHeader from './user-header';
import AccountWelcome from './account-welcome';
import ContinueSubscriptionButton from './continue-subscription-button';
import ContinueGiftSubscriptionBanner from './continue-gift-subscription-banner';
import AccountActions from './account-actions';

const AccountMain = () => {
  return (
    <div className="relative scrollbar-none">
      <CloseButton />
      <UserHeader />
      <section className="mb-10">
        <AccountWelcome />
        <ContinueGiftSubscriptionBanner />
        <ContinueSubscriptionButton />
        <AccountActions />
      </section>
    </div>
  );
};

export default AccountMain;
