import AccountPage from './portal/AccountPage';
import LookAndFeel from './portal/LookAndFeel';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import SignupOptions from './portal/SignupOptions';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';

const Sidebar: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('signupOptions');

    const tabs: Tab[] = [
        {
            id: 'signupOptions',
            title: 'Signup options',
            contents: <SignupOptions />
        },
        {
            id: 'lookAndFeel',
            title: 'Look & feel',
            contents: <LookAndFeel />
        },
        {
            id: 'accountPage',
            title: 'Account page',
            contents: <AccountPage />
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='pt-4'>
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
        </div>
    );
};

const PortalModal: React.FC = () => {
    const sidebar = <Sidebar />;

    return <PreviewModalContent
        preview={<>Preview</>}
        sidebar={sidebar}
        testId='portal-modal'
    />;
};

export default NiceModal.create(PortalModal);