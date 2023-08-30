import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import ConfirmationModal from '../../../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import Table from '../../../admin-x-ds/global/Table';
import TableCell from '../../../admin-x-ds/global/TableCell';
import TableRow from '../../../admin-x-ds/global/TableRow';
import useRouting from '../../../hooks/useRouting';
import RecommendationList from './recommendations/RecommendationList';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {useBrowseRecommendations} from '../../../api/recommendations';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        handleSave
    } = useSettingGroup();
    const {data: {recommendations} = {}} = useBrowseRecommendations();
    const [selectedTab, setSelectedTab] = useState('your-recommendations');
  
    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
        }} />
    );
  
    const action = (
        <Button color='red' label='Remove' link onClick={() => {
            NiceModal.show(ConfirmationModal, {
                title: 'Remove recommendation',
                prompt: <>
                    <p>Your recommendation <strong>Lenny Nesletter</strong> will no longer be visible to your audience.</p>
                </>,
                okLabel: 'Remove',
                onOk: async (modal) => {
                    modal?.remove();
                }
            });
        }} />
    );

    const tabs = [
        {
            id: 'your-recommendations',
            title: 'Your recommendations',
            contents: (<RecommendationList recommendations={recommendations ?? []} />)
        },
        {
            id: 'recommending-you',
            title: 'Recommending you',
            contents: (<RecommendationList recommendations={[]} />)
        }
    ];
  
    return (
        <SettingGroup
            customButtons={buttons}
            description="Share favorite sites with your audience"
            keywords={keywords}
            navid='recommendations'
            testId='recommendations'
            title="Recommendations"
            saveState={saveState}
            onSave={handleSave}
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Recommendations;