import CodeInjection from './CodeInjection';
import History from './History';
import Integrations from './Integrations';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    integrations: ['integration', 'zapier', 'slack', 'amp', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github'],
    codeInjection: ['newsletter', 'enable', 'disable', 'turn on'],
    history: ['history', 'log', 'events', 'user events', 'staff']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <Integrations keywords={searchKeywords.integrations} />
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <History keywords={searchKeywords.history} />
        </SettingSection>
    );
};

export default AdvancedSettings;
