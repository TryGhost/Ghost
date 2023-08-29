import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';

const Recommendations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        saveState,
        handleSave
    } = useSettingGroup();

    return (
        <SettingGroup
            description="Recommend sites to your audience, and get recommended by others."
            keywords={keywords}
            navid='recommendations'
            saveState={saveState}
            testId='recommendations'
            title="Recommendations"
            onSave={handleSave}
        >
        </SettingGroup>
    );
};

export default Recommendations;