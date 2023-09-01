import Button from '../../../admin-x-ds/global/Button';
import EditRecommendationModal from './recommendations/EditRecommendationModal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import RecommendationList from './recommendations/RecommendationList';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import TabView from '../../../admin-x-ds/global/TabView';
import useDetailModalRoute from '../../../hooks/useDetailModalRoute';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {modalRoutes} from '../../providers/RoutingProvider';
import {useBrowseRecommendations} from '../../../api/recommendations';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        handleSave
    } = useSettingGroup();
    const {data: {recommendations} = {}} = useBrowseRecommendations();
    const [selectedTab, setSelectedTab] = useState('your-recommendations');

    useDetailModalRoute({
        route: modalRoutes.editRecommendation,
        items: recommendations || [],
        showModal: recommendation => NiceModal.show(EditRecommendationModal, {recommendation})
    });

    const {updateRoute} = useRouting();
    const openAddNewRecommendationModal = () => {
        updateRoute('recommendations/add');
    };

    const buttons = (
        <Button color='green' label='Add recommendation' link={true} onClick={() => {
            openAddNewRecommendationModal();
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
            saveState={saveState}
            testId='recommendations'
            title="Recommendations"
            onSave={handleSave}
        >
            <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </SettingGroup>
    );
};

export default Recommendations;
