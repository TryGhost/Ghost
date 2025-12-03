import CloseButton from '../../../common/close-button';

import UserHeader from './user-header';
import AccountWelcome from './account-welcome';
import ContinueSubscriptionButton from './continue-subscription-button';
import AccountActions from './account-actions';

const AccountMain = () => {
    return (
        <div className='gh-portal-content gh-portal-account-main'>
            <CloseButton />
            <UserHeader />
            <section className='gh-portal-account-data'>
                <AccountWelcome />
                <ContinueSubscriptionButton />
                <AccountActions />
            </section>
        </div>
    );
};

export default AccountMain;
