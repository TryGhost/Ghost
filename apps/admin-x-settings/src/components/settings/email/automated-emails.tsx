import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {CustomizationTrigger} from './customization/trigger';
import {WelcomeEmailsContent} from '../membership/member-emails';
import {useBrowseAutomatedEmails} from '@tryghost/admin-x-framework/api/automated-emails';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const AutomatedEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {data: {automated_emails: automatedEmails} = {}} = useBrowseAutomatedEmails({
        searchParams: {limit: '1'}
    });
    const automationId = automatedEmails?.[0]?.id;

    const buttons = automationId ? (
        <CustomizationTrigger id={automationId} type='automation' />
    ) : undefined;

    return (
        <TopLevelGroup
            customButtons={buttons}
            description="Manage automated emails that are sent to your members"
            keywords={keywords}
            navid='automated-emails'
            testId='automated-emails'
            title='Automated emails'
        >
            <WelcomeEmailsContent />
            {/* {newsletterId && <NewsletterBtn id={newsletterId} />} */}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(AutomatedEmails, 'Automated emails');
