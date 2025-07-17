import CodeInjection from './CodeInjection';
import DangerZone from './DangerZone';
import History from './History';
import Integrations from './Integrations';
import Labs from './Labs';
import MigrationTools from './MigrationTools';
import React from 'react';
import SearchableSection from '../../SearchableSection';
import SpamFilters from './SpamFilters';
import useFeatureFlag from '../../../hooks/useFeatureFlag';

export const searchKeywords5x = {
    integrations: ['advanced', 'integrations', 'zapier', 'slack', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github', 'webhooks'],
    migrationtools: ['import', 'export', 'migrate', 'substack', 'substack', 'migration', 'medium', 'wordpress', 'wp', 'squarespace'],
    codeInjection: ['advanced', 'code injection', 'head', 'footer'],
    labs: ['advanced', 'labs', 'alpha', 'private', 'beta', 'flag', 'routes', 'redirect', 'translation', 'editor', 'portal'],
    history: ['advanced', 'history', 'log', 'events', 'user events', 'staff', 'audit', 'action'],
    dangerzone: ['danger', 'danger zone', 'delete', 'content', 'delete all content', 'delete site'],
    spamFilters: ['membership', 'signup', 'sign up', 'spam', 'filters', 'prevention', 'prevent', 'block', 'domains', 'email']
};

export const searchKeywords = {
    integrations: ['advanced', 'integrations', 'zapier', 'slack', 'unsplash', 'first promoter', 'firstpromoter', 'pintura', 'disqus', 'analytics', 'ulysses', 'typeform', 'buffer', 'plausible', 'github', 'webhooks'],
    migrationtools: ['import', 'export', 'migrate', 'substack', 'substack', 'migration', 'medium', 'wordpress', 'wp', 'squarespace'],
    codeInjection: ['advanced', 'code injection', 'head', 'footer'],
    labs: ['advanced', 'labs', 'alpha', 'private', 'beta', 'flag', 'routes', 'redirect', 'translation', 'editor', 'portal'],
    history: ['advanced', 'history', 'log', 'events', 'user events', 'staff', 'audit', 'action'],
    dangerzone: ['danger', 'danger zone', 'delete', 'content', 'delete all content', 'delete site']
};

const AdvancedSettings: React.FC = () => {
    const ui60 = useFeatureFlag('ui60');

    if (!ui60) {
        return (
            <SearchableSection keywords={Object.values(searchKeywords5x).flat()} title='Advanced'>
                <Integrations keywords={searchKeywords5x.integrations} />
                <MigrationTools keywords={searchKeywords5x.migrationtools} />
                <SpamFilters keywords={searchKeywords5x.spamFilters} />
                <CodeInjection keywords={searchKeywords5x.codeInjection} />
                <Labs keywords={searchKeywords5x.labs} />
                <History keywords={searchKeywords5x.history} />
                <DangerZone keywords={searchKeywords5x.dangerzone} />
            </SearchableSection>
        );
    }

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
