import React from 'react';
import {mockAutomations} from '@/automations/proto/shared/mock';
import {AutomationsTable} from '@/automations/proto/shared/automations-table';
import {Box, Container} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';

const AutomationsList: React.FC = () => {
    return (
        <Box className="size-full">
            <Container className="relative flex h-full flex-col" size="page">
                <ListPage data-testid="automations-proto-float">
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>Automations</PageHeader.Title>
                            </PageHeader.Left>
                        </PageHeader>
                    </ListPage.Header>
                    <ListPage.Body>
                        <AutomationsTable automations={mockAutomations} basePath="/automations-proto/float" />
                    </ListPage.Body>
                </ListPage>
            </Container>
        </Box>
    );
};

export default AutomationsList;
export const Component = AutomationsList;
