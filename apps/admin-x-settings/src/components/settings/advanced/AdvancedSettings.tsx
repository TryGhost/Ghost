import CodeInjection from './CodeInjection';
import DangerZone from './DangerZone';
import History from './History';
import Integrations from './Integrations';
import Labs from './Labs';
import MigrationTools from './MigrationTools';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import SpamFilters from './SpamFilters';

export const searchKeywords = {
    integrations: ['advanced', 'integrations', 'zapier', 'slack', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github', 'webhooks'],
    migrationtools: ['import', 'export', 'migrate', 'substack', 'substack', 'migration', 'medium', 'wordpress', 'wp'],
    codeInjection: ['advanced', 'code injection', 'head', 'footer'],
    labs: ['advanced', 'labs', 'alpha', 'beta', 'flag', 'routes', 'redirect', 'translation', 'editor', 'portal'],
    history: ['advanced', 'history', 'log', 'events', 'user events', 'staff'],
    dangerzone: ['danger', 'danger zone', 'delete', 'content', 'delete all content', 'delete site'],
    spamFilters: ['membership', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <Integrations keywords={searchKeywords.integrations} />
            <MigrationTools keywords={searchKeywords.migrationtools} />
            <SpamFilters keywords={searchKeywords.spamFilters} />
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <Labs keywords={searchKeywords.labs} />
            <History keywords={searchKeywords.history} />
            <DangerZone keywords={searchKeywords.dangerzone} />
        </SearchableSection>
    );
};

export default AdvancedSettings;
