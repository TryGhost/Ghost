import AutomationsList from './components/automations-list';
import MainLayout from '@src/components/layout/main-layout';
import React from 'react';
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
                            <PageHeader.Title>Automations</PageHeader.Title>
                        </PageHeader.Left>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    <AutomationsList automations={automations} isLoading={isLoading} />
                </ListPage.Body>
            </ListPage>
        </MainLayout>
    );
};

export default Automations;
