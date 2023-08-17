import Button from '../../../admin-x-ds/global/Button';
import NewsletterDetailModal from './newsletters/NewsletterDetailModal';
import NewslettersList from './newsletters/NewslettersList';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useDetailModalRoute from '../../../hooks/useDetailModalRoute';
import useRouting from '../../../hooks/useRouting';
import {modalRoutes} from '../../providers/RoutingProvider';
import {useBrowseNewsletters} from '../../../api/newsletters';

const Newsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const openNewsletterModal = () => {
        updateRoute('newsletters/add');
    };
    const [selectedTab, setSelectedTab] = useState('active-newsletters');
    const {data: {newsletters} = {}} = useBrowseNewsletters();

    useDetailModalRoute({
        route: modalRoutes.showNewsletter,
        items: newsletters || [],
        showModal: newsletter => NiceModal.show(NewsletterDetailModal, {newsletter})
    });

    const buttons = (
        <Button color='green' label='Add newsletter' link={true} onClick={() => {
            openNewsletterModal();
        }} />
    );

    const tabs = [
        {
            id: 'active-newsletters',
            title: 'Active',
            contents: (<NewslettersList newsletters={newsletters?.filter(newsletter => newsletter.status === 'active') || []} />)
        },
        {
            id: 'archived-newsletters',
            title: 'Archived',
            contents: (<NewslettersList newsletters={newsletters?.filter(newsletter => newsletter.status !== 'active') || []} />)
        }
    ];

    return (
        <SettingGroup
            customButtons={buttons}
            keywords={keywords}
            navid='newsletters'
            testId='newsletters'
            title='Newsletters'
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Newsletters;
