import Layout from '@components/layout';
import Profile from './components/Profile';
import React from 'react';
import Settings from './components/Settings';
import {useAccountForUser} from '@hooks/use-activity-pub-queries';

const Preferences: React.FC = () => {
    const {data: account, isLoading: isLoadingAccount} = useAccountForUser('index', 'me');

    return (
        <Layout>
            <div className='mx-auto max-w-[620px] px-6 py-12'>
                <Profile account={account} isLoading={isLoadingAccount} />
                <Settings account={account} className='mt-9' />
            </div>
        </Layout>
    );
};

export default Preferences;
