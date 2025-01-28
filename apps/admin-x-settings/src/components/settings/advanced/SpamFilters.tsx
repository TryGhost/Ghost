import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {SettingGroupContent, TextArea, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const SpamFilters: React.FC<{ keywords: string[] }> = ({keywords}) => {
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

        const validEmailDomains = input
            .split(/[\s,]+/) // Split by space, comma, or newline
            .map(domain => domain.trim().toLowerCase().split('@').pop()) // Normalise and keep only the email domain, e.g. 'hello@spam.xyz' -> 'spam.xyz'
            .filter(domain => domain && domain.includes('.')); // Filter out domains without a dot

        updateSetting('blocked_email_domains', JSON.stringify(validEmailDomains));

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const hint = (
        <>
            Prevent unwanted signups by blocking email domains. Add one domain per line, e.g., <code>spam.xyz</code> to block signups from email addresses like <code>hello@spam.xyz</code>.
        </>
    );

    return (
        <TopLevelGroup
            description='Protect your member signups from spam'
            isEditing={isEditing}
            keywords={keywords}
            navid='spam-filters'
            saveState={saveState}
            testId='spam-filters'
            title='Spam filters'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <TextArea
                    className='h-[86px]'
                    error={!!errors.blockedEmailDomains}
                    hint={errors.blockedEmailDomains || hint}
                    placeholder={`spam.xyz\njunk.com`}
                    title='Blocked email domains'
                    value={blockedEmailDomains}
                    onChange={updateBlockedEmailDomainsSetting}
                    onKeyDown={() => clearError('spam-filters')}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SpamFilters, 'Spam Filters');
