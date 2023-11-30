import CodeInjection from './CodeInjection';
import History from './History';
import Integrations from './Integrations';
import Labs from './Labs';
import React from 'react';
import SearchableSection from '../../SearchableSection';

export const searchKeywords = {
    integrations: ['advanced', 'integrations', 'zapier', 'slack', 'amp', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github'],
    codeInjection: ['advanced', 'code injection', 'head', 'footer'],
    labs: ['advanced', 'labs', 'alpha', 'beta', 'flag', 'import', 'export', 'migrate', 'routes', 'redirect', 'translation', 'delete', 'content', 'editor', 'substack', 'migration', 'portal'],
    history: ['advanced', 'history', 'log', 'events', 'user events', 'staff']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <Integrations keywords={searchKeywords.integrations} />
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <Labs keywords={searchKeywords.labs} />
            <History keywords={searchKeywords.history} />
        </SearchableSection>
    );
};

export default AdvancedSettings;
