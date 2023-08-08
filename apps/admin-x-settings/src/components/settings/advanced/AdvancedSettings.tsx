import CodeInjection from './CodeInjection';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    codeInjection: ['newsletter', 'enable', 'disable', 'turn on']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <CodeInjection keywords={searchKeywords.codeInjection} />
        </SettingSection>
    );
};

export default AdvancedSettings;
