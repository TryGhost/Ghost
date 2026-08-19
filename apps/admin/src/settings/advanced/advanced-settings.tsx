import CodeInjection from './code-injection';
import DangerZone from './danger-zone';
import History from './history';
import Integrations from './integrations';
import Labs from './labs';
import MigrationTools from './migration-tools';
import React from 'react';
import SearchableSection from '@/settings/components/searchable-section';
import {searchKeywords} from './search-keywords';

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
