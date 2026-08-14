import AutomationsHelpCards from './components/automations-help-cards';
import AutomationsList from './components/automations-list';
import MainLayout from '@src/components/layout/main-layout';
import React from 'react';
import {Badge} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {useVisibleAutomations} from './hooks/use-visible-automations';

const Automations: React.FC = () => {
    const {automations, error, isError, isLoading} = useVisibleAutomations();

    if (isError) {
        throw error || new Error('Failed to load automations');
    }

    return (
        <MainLayout>
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
        </MainLayout>
    );
};

export default Automations;
