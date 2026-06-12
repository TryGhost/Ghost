import CodeInjection from './code-injection';
import DangerZone from './danger-zone';
import History from './history';
import Integrations from './integrations';
import Labs from './labs';
import MigrationTools from './migration-tools';
import React from 'react';
import SearchableSection from '../../searchable-section';

export const searchKeywords = {
    integrations: ['advanced', 'integrations', 'zapier', 'slack', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github', 'webhooks'],
    migrationtools: ['import', 'export', 'migrate', 'substack', 'substack', 'migration', 'medium', 'wordpress', 'wp', 'squarespace', 'beehiiv'],
    codeInjection: ['advanced', 'code injection', 'head', 'footer'],
    labs: ['advanced', 'labs', 'alpha', 'private', 'beta', 'flag', 'routes', 'redirect', 'translation', 'editor', 'portal'],
    history: ['advanced', 'history', 'log', 'events', 'user events', 'staff', 'audit', 'action'],
    dangerzone: ['danger zone', 'delete all content', 'delete site', 'reset all authentication', 'reset api keys', 'reset password', 'compromised credentials', 'lock staff users', 'sign out all staff']
};

const AdvancedSettings: React.FC = () => {
    return (
        <SearchableSection keywords={Object.values(searchKeywords).flat()} title='Advanced'>
            <Integrations keywords={searchKeywords.integrations} />
            <MigrationTools keywords={searchKeywords.migrationtools} />
            <CodeInjection keywords={searchKeywords.codeInjection} />
            <Labs keywords={searchKeywords.labs} />
            <History keywords={searchKeywords.history} />
            <DangerZone keywords={searchKeywords.dangerzone} />
        </SearchableSection>
    );
};

export default AdvancedSettings;
