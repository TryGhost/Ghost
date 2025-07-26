import Error from '@components/layout/Error';
import Layout from '@components/layout';
import Profile from './components/Profile';
import React from 'react';
import Settings from './components/Settings';
import {isApiError} from '@src/api/activitypub';
import {useAccountForUser} from '@hooks/use-activity-pub-queries';

const Preferences: React.FC = () => {
    const {data: account, isLoading: isLoadingAccount, error: accountError} = useAccountForUser('index', 'me');

    if (accountError && isApiError(accountError)) {
        return <Error statusCode={accountError.statusCode} />;
    }

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] py-[min(4vh,48px)]'>
                <Profile account={account} isLoading={isLoadingAccount} />
                <Settings account={account} className='mt-9' />
            </div>
        </Layout>
    );
};

export default Preferences;
