import CodeInjection from './CodeInjection';
import History from './History';
import Integrations from './Integrations';
import Labs from './Labs';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

const searchKeywords = {
    integrations: ['integration', 'zapier', 'slack', 'amp', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github'],
    codeInjection: ['newsletter', 'enable', 'disable', 'turn on'],
    labs: ['labs', 'alpha', 'beta', 'flag', 'import', 'export', 'migrate', 'routes', 'redirects', 'translation', 'delete'],
    history: ['history', 'log', 'events', 'user events', 'staff']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SettingSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <Integrations keywords={searchKeywords.integrations} />
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <Labs keywords={searchKeywords.labs} />
            <History keywords={searchKeywords.history} />
        </SettingSection>
    );
};

export default AdvancedSettings;
