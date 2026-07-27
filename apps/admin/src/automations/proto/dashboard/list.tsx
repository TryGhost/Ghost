import React, {useState} from 'react';
import {mockAutomations} from '@/automations/proto/shared/mock';
import {AutomationsTable} from '@/automations/proto/shared/automations-table';
import {NewAutomationDialog} from '@/automations/proto/shared/new-automation-dialog';
import {Button} from '@tryghost/shade/components';
import {Box, Container} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {LucideIcon} from '@tryghost/shade/utils';

const AutomationsList: React.FC = () => {
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="automations-proto-dashboard">
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>Automations</PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button onClick={() => setTemplateDialogOpen(true)}>
                                        <LucideIcon.Plus />
                                        New automation
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                    </ListPage.Header>
                    <ListPage.Body>
                        <AutomationsTable automations={mockAutomations} basePath="/automations-proto/dashboard" />
                    </ListPage.Body>
                </ListPage>
            </Container>

            <NewAutomationDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} />
        </Box>
    );
};

export default AutomationsList;
export const Component = AutomationsList;
