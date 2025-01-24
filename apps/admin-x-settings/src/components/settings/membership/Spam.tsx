import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, TextArea, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const Spam: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        errors,
        clearError,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            return {};
        }
    });

    const [initialBlockedEmailDomainsJSON] = getSettingValues(localSettings, ['blocked_email_domains']) as string[];
    const initialBlockedEmailDomains = JSON.parse(initialBlockedEmailDomainsJSON || '[]') as string[];
    const [blockedEmailDomains, setBlockedEmailDomains] = React.useState(initialBlockedEmailDomains.join('\n'));

    const updateBlockedEmailDomainsSetting = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = e.target.value;
        setBlockedEmailDomains(input);

        const parsedDomains = input
            .split(/[\s,]+/) // Split by space, comma, or newline
            .map(item => item.trim())
            .map((item) => {
                // Remove '@' and anything before it
                const atIndex = item.indexOf('@');
                return atIndex !== -1 ? item.slice(atIndex + 1) : item;
            })
            .map(item => item.toLowerCase())
            .filter(item => item.includes('.'));

        updateSetting('blocked_email_domains', JSON.stringify(parsedDomains));

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const hint = (
        <>
            Enter one email provider per line. For example, <code>spam.xyz</code> to block signups from email addresses like <code>hello@spam.xyz</code>
        </>
    );

    return (
        <TopLevelGroup
            description='Block unwanted signups from specific email providers'
            isEditing={isEditing}
            keywords={keywords}
            navid='spam'
            saveState={saveState}
            testId='spam'
            title='Spam prevention'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <TextArea
                    error={!!errors.blockedEmailDomains}
                    hint={errors.blockedEmailDomains || hint}
                    placeholder={`spam.xyz\njunk.com`}
                    title='Blocked email providers'
                    value={blockedEmailDomains}
                    onChange={updateBlockedEmailDomainsSetting}
                    onKeyDown={() => clearError('spam')}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Spam, 'Spam');
