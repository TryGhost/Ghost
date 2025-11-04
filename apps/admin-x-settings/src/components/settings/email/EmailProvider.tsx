import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {IconLabel, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const EmailProvider: React.FC<{keywords: string[]}> = ({keywords}) => {
    const {config} = useGlobalData();
    const emailProvider = config.emailProvider || {active: null, isConfigured: false};

    const providerNames: Record<string, string> = {
        mailgun: 'Mailgun',
        ses: 'Amazon SES',
        sendgrid: 'SendGrid',
        postmark: 'Postmark'
    };

    const providerName = emailProvider.active ? providerNames[emailProvider.active] || emailProvider.active : 'None';
    const isConfigured = emailProvider.isConfigured;

    const getStatusLabel = () => {
        if (!emailProvider.active) {
            return <span className="text-grey-500">No email provider configured</span>;
        }

        if (isConfigured) {
            return (
                <IconLabel icon='check-circle' iconColorClass='text-green'>
                    {providerName} is configured
                </IconLabel>
            );
        }

        return <span className="text-grey-500">{providerName} is not configured</span>;
    };

    const description = emailProvider.active === 'ses'
        ? 'Amazon SES is used for bulk email newsletter delivery. Configuration is managed via config files.'
        : 'The email provider is used for bulk email newsletter delivery.';

    const values = [
        {
            heading: 'Active provider',
            key: 'provider',
            value: providerName
        },
        {
            heading: 'Status',
            key: 'status',
            value: getStatusLabel()
        }
    ];

    return (
        <TopLevelGroup
            description={description}
            keywords={keywords}
            navid='email-provider'
            testId='email-provider'
            title="Email provider"
        >
            <SettingGroupContent
                columns={1}
                values={values}
            />
            {emailProvider.active === 'ses' && (
                <div className="mt-4 rounded border border-grey-200 bg-grey-50 p-4 dark:border-grey-800 dark:bg-grey-950">
                    <p className="text-xs text-grey-700 dark:text-grey-400">
                        <strong>Note:</strong> Amazon SES configuration is managed through Ghost's config files.
                        Update your <code className="rounded bg-grey-200 px-1 dark:bg-grey-900">config.production.json</code> or environment variables to configure SES settings.
                    </p>
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(EmailProvider, 'Email provider');
