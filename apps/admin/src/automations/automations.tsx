import AutomationsHelpCards from './components/automations-help-cards';
import AutomationsList from './components/automations-list';
import React from 'react';
import {Badge} from '@tryghost/shade/components';
import {Box, Container} from '@tryghost/shade/primitives';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {useVisibleAutomations} from './hooks/use-visible-automations';

const Automations: React.FC = () => {
    const {automations, error, isError, isLoading} = useVisibleAutomations();

    if (isError) {
        throw error instanceof Error ? error : new Error('Failed to load automations');
    }

    return (
        <Box className='size-full'>
            <Container className='relative flex h-full flex-col' size='page'>
            <ListPage data-testid="automations-page">
                <ListPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Title>
                                <span className='inline-flex items-baseline gap-2'>
                                    Automations
                                    <Badge className='px-1 py-px text-[10px] leading-none tracking-wider uppercase' variant='secondary'>Beta</Badge>
                                </span>
                            </PageHeader.Title>
                        </PageHeader.Left>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    <AutomationsList automations={automations} isLoading={isLoading} />
                    <AutomationsHelpCards />
                </ListPage.Body>
            </ListPage>
            </Container>
        </Box>
    );
};

export default Automations;
