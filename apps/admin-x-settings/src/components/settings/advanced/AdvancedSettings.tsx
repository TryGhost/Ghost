import CodeInjection from './CodeInjection';
import History from './History';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    codeInjection: ['newsletter', 'enable', 'disable', 'turn on'],
    history: ['history', 'log', 'events', 'user events', 'staff']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <History keywords={searchKeywords.history} />
        </SettingSection>
    );
};

export default AdvancedSettings;
