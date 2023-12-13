import MigrationToolsExport from './migrationtools/MigrationToolsExport';
import MigrationToolsImport from './migrationtools/MigrationToolsImport';
import React, {useState} from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {SettingGroupHeader, Tab, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';

type MigrationTab = 'import' | 'export';

const MigrationTools: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<MigrationTab>('import');

    const tabs = [
        {
            id: 'import',
            title: 'Import',
            contents: <MigrationToolsImport />
        },
        {
            id: 'export',
            title: 'Export',
            contents: <MigrationToolsExport />
        }
    ].filter(Boolean) as Tab<MigrationTab>[];

    return (
        <TopLevelGroup
            customHeader={
                <SettingGroupHeader description='Import content, members and subscriptions from other platforms or export your Ghost data.' title='Migration tools' />
            }
            keywords={keywords}
            navid='migration'
            testId='migrationtools'
        >
            <TabView<'import' | 'export'> selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MigrationTools, 'Migration tools');
