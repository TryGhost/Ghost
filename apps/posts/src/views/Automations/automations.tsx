import AutomationsList from './components/automations-list';
import EmailDesignButton from './components/email-design-button';
import MainLayout from '@components/layout/main-layout';
import React from 'react';
import {ListPage} from '@tryghost/shade/page-templates';
import {PageHeader} from '@tryghost/shade/patterns';
import {useBrowseAutomations} from '@tryghost/admin-x-framework/api/automations';

const Automations: React.FC = () => {
    const {data, error, isError, isLoading} = useBrowseAutomations({
        defaultErrorHandler: false
    });

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
                        <PageHeader.Actions>
                            <EmailDesignButton />
                        </PageHeader.Actions>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    <AutomationsList automations={data?.automations} isLoading={isLoading} />
                </ListPage.Body>
            </ListPage>
        </MainLayout>
    );
};

export default Automations;
