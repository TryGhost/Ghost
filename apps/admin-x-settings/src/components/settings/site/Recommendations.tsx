import Button from '../../../admin-x-ds/global/Button';
import React, {useState} from 'react';
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

    const buttons = (
        <Button color='green' label='Add recommendation' link={true} onClick={() => {}} />
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
            description="Recommend sites to your audience, and get recommended by others."
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
