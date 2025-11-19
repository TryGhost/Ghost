import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Icon, SettingGroupContent, Toggle, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const MemberWelcomeEmails: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const [welcomeEmailsEnabled] = getSettingValues<boolean>(settings, ['member_welcome_emails_enabled']);

    const handleToggleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const updates: Setting[] = [
            {key: 'member_welcome_emails_enabled', value: e.target.checked}
        ];

        try {
            await editSettings(updates);
        } catch (error) {
            handleError(error);
        }
    };

    const enableToggle = (
        <>
            <Toggle
                checked={!!welcomeEmailsEnabled}
                direction='rtl'
                onChange={handleToggleChange}
            />
        </>
    );

    return (<TopLevelGroup
        customButtons={enableToggle}
        description='Send a welcome email when new members sign up'
        keywords={keywords}
        navid='member-welcome-emails'
        testId='member-welcome-emails'
        title='Member welcome emails'
    >
        <SettingGroupContent
            columns={1}
            values={[
                {
                    key: 'status',
                    value: (welcomeEmailsEnabled) ? 
                        <div className='flex items-center gap-2'>
                            <Icon colorClass='text-green' name='check' size='sm' />
                            <span>Enabled</span>
                        </div> :
                        <div className='flex items-center gap-2 text-grey-900'>
                            <Icon colorClass='text-grey-600' name='mail-block' size='sm' />
                            <span>Disabled</span>
                        </div>
                }
            ]}
        />
    </TopLevelGroup>);
};

export default withErrorBoundary(MemberWelcomeEmails, 'Member welcome emails');

