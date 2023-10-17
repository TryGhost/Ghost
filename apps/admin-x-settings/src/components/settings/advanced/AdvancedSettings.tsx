import CodeInjection from './CodeInjection';
import History from './History';
import Integrations from './Integrations';
import Labs from './Labs';
import React from 'react';
import SettingSection from '../../../admin-x-ds/settings/SettingSection';

export const searchKeywords = {
    integrations: ['integrations', 'zapier', 'slack', 'amp', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github'],
    codeInjection: ['code injection', 'head', 'footer'],
    labs: ['labs', 'alpha', 'beta', 'flag', 'import', 'export', 'migrate', 'routes', 'redirect', 'translation', 'delete', 'content', 'editor', 'substack', 'migration', 'portal'],
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
