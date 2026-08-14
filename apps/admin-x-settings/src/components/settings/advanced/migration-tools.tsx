import MigrationToolsExport from './migration-tools/migration-tools-export';
import MigrationToolsImport from './migration-tools/migration-tools-import';
import React, {useState} from 'react';
import TopLevelGroup from '../../top-level-group';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {withErrorBoundary} from '../../error-boundary';

type MigrationTab = 'import' | 'export';

const MigrationTools: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState<MigrationTab>('import');

    return (
        <TopLevelGroup
            description='Import content, members and subscriptions from other platforms or export your Ghost data.'
            keywords={keywords}
            navid='migration'
            testId='migrationtools'
            title='Migration tools'
        >
            <Tabs value={selectedTab} variant='underline' onValueChange={value => setSelectedTab(value as MigrationTab)}>
                <TabsList>
                    <TabsTrigger value='import'>Import</TabsTrigger>
                    <TabsTrigger value='export'>Export</TabsTrigger>
                </TabsList>
                <TabsContent value='import'><MigrationToolsImport /></TabsContent>
                <TabsContent value='export'><MigrationToolsExport /></TabsContent>
            </Tabs>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(MigrationTools, 'Migration tools');
