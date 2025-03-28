import CloseButton from '../../../../components/common/CloseButton';

import UserHeader from './UserHeader';
import AccountWelcome from './AccountWelcome';
import ContinueSubscriptionButton from './ContinueSubscriptionButton';
import AccountActions from './AccountActions';

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
