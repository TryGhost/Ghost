import React from 'react';
import TopLevelGroup from '../../top-level-group';
import VerifiedEmailSelect from './verified-email-select';
import useSettingGroup from '../../../hooks/use-setting-group';
import {TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {sendingDomain as getSendingDomain, isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

const EmailIdentity: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();
    const {config, settings} = useGlobalData();

    const [senderName, senderEmail, senderReplyTo, siteTitle] = getSettingValues(localSettings, [
        'email_default_sender_name', 'email_default_sender_email', 'email_default_sender_reply_to', 'title'
    ]) as string[];

    // Calculated fields from the backend — the actual values used when sending
    const [defaultEmailAddress] = getSettingValues<string>(settings, ['default_email_address']);

    const managedEmail = isManagedEmail(config);
    const domain = getSendingDomain(config);

    const displayName = senderName || siteTitle || '';
    const displayEmail = senderEmail || defaultEmailAddress || '';
    const displayReplyTo = senderReplyTo || '';

    const emailPreview = (
        <div className="border-grey-200 text-grey-700 flex min-h-[77px] flex-col justify-center rounded-sm border bg-white px-6 text-sm">
            <p className="leading-normal">
                <span className="text-grey-900 font-semibold">From: </span>
                <span>{displayName} ({displayEmail})</span>
            </p>
            <p className="leading-normal">
                <span className="text-grey-900 font-semibold">Reply-to: </span>
                {displayReplyTo || displayEmail}
            </p>
        </div>
    );

    const renderSenderEmailField = () => {
        if (managedEmail) {
            return (
                <VerifiedEmailSelect
                    context={{type: 'setting', key: 'email_default_sender_email'}}
                    placeholder="From address"
                    sendingDomain={domain}
                    value={senderEmail || ''}
                    onChange={value => updateSetting('email_default_sender_email', value)}
                />
            );
        }
        return (
            <TextField
                placeholder="noreply@example.com"
                value={senderEmail || ''}
                hideTitle
                onChange={e => updateSetting('email_default_sender_email', e.target.value)}
            />
        );
    };

    const renderReplyToField = () => {
        if (managedEmail) {
            return (
                <VerifiedEmailSelect
                    context={{type: 'setting', key: 'email_default_sender_reply_to'}}
                    placeholder="Reply-to address"
                    sendingDomain={domain}
                    value={senderReplyTo || ''}
                    onChange={value => updateSetting('email_default_sender_reply_to', value)}
                />
            );
        }
        return (
            <TextField
                placeholder="reply@example.com"
                value={senderReplyTo || ''}
                hideTitle
                onChange={e => updateSetting('email_default_sender_reply_to', e.target.value)}
            />
        );
    };

    const fieldWithHint = (title: string, description: string, field: React.ReactNode) => (
        <div className='flex flex-col gap-1'>
            <span className='text-sm font-semibold'>{title}</span>
            <span className='text-grey-700 dark:text-grey-600 -mt-0.5 mb-1 text-xs'>{description}</span>
            {field}
        </div>
    );

    const inputs = (
        <div className='flex flex-col gap-6'>
            {fieldWithHint(
                'Sender name',
                'The name shown in the "From" field of your emails',
                <TextField
                    placeholder={siteTitle || 'Your site name'}
                    value={senderName || ''}
                    hideTitle
                    onChange={e => updateSetting('email_default_sender_name', e.target.value)}
                />
            )}
            {fieldWithHint(
                'From address',
                'The default email address your newsletters and emails are sent from',
                renderSenderEmailField()
            )}
            {fieldWithHint(
                'Reply-to address',
                'Where replies to your emails will be sent',
                renderReplyToField()
            )}
        </div>
    );

    return (
        <TopLevelGroup
            description="Default sender details for newsletters and automated emails"
            isEditing={isEditing}
            keywords={keywords}
            navid='emails'
            saveState={saveState}
            testId='emails'
            title='Sender details'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {emailPreview}
            {isEditing && inputs}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(EmailIdentity, 'EmailIdentity');
