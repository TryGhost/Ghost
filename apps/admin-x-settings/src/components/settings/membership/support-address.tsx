import React from 'react';
import TopLevelGroup from '../../top-level-group';
import VerifiedEmailSelect from '../email/verified-email-select';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {fullEmailAddress} from '@tryghost/admin-x-framework/api/site';
import {sendingDomain as getSendingDomain, isManagedEmail} from '@tryghost/admin-x-framework/api/config';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';

const SupportAddress: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();
    const {config, siteData} = useGlobalData();

    const [membersSupportAddress] = getSettingValues(localSettings, ['members_support_address']) as string[];

    const managedEmail = isManagedEmail(config);
    const domain = getSendingDomain(config);

    const supportDisplayValue = membersSupportAddress
        ? (membersSupportAddress === 'noreply' ? fullEmailAddress('noreply', siteData!, config) : membersSupportAddress)
        : 'Not set';

    const values = (
        <SettingGroupContent
            columns={1}
            values={[
                {heading: 'Support address', key: 'support-address', value: supportDisplayValue}
            ]}
        />
    );

    const renderSupportEmailField = () => {
        if (managedEmail) {
            return (
                <VerifiedEmailSelect
                    context={{type: 'setting', key: 'members_support_address'}}
                    placeholder="Support email address"
                    sendingDomain={domain}
                    specialOptions={[{value: 'noreply', label: 'No reply'}]}
                    value={membersSupportAddress || 'noreply'}
                    onChange={value => updateSetting('members_support_address', value)}
                />
            );
        }
        return (
            <TextField
                placeholder="support@example.com"
                value={membersSupportAddress || ''}
                hideTitle
                onChange={e => updateSetting('members_support_address', e.target.value)}
            />
        );
    };

    const inputs = (
        <div className='flex flex-col gap-1'>
            <span className='text-grey-700 dark:text-grey-600 text-xs'>Used for member account and billing emails</span>
            {renderSupportEmailField()}
        </div>
    );

    return (
        <TopLevelGroup
            description="The email address members can contact you at"
            isEditing={isEditing}
            keywords={keywords}
            navid='support-address'
            saveState={saveState}
            testId='support-address'
            title='Support address'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputs : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SupportAddress, 'SupportAddress');
