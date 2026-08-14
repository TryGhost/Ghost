import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Banner, Switch} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {SettingGroupContent} from '@tryghost/shade/patterns';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const EnableNewsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();

    const [newslettersEnabled, membersSignupAccess] = getSettingValues<string>(settings, ['editor_default_email_recipients', 'members_signup_access']);

    const isDisabled = membersSignupAccess === 'none';

    const handleToggleChange = async (checked: boolean) => {
        const updates: Setting[] = [
            {key: 'editor_default_email_recipients', value: (checked ? 'visibility' : 'disabled')}
        ];

        if (!checked) {
            updates.push({key: 'editor_default_email_recipients_filter', value: null});
        }

        try {
            await editSettings(updates);
        } catch (error) {
            handleError(error);
        }
    };

    const enableToggle = (
        <>
            <Switch
                aria-label='Newsletters'
                checked={newslettersEnabled !== 'disabled' && !isDisabled}
                disabled={isDisabled}
                onCheckedChange={handleToggleChange}
            />
        </>
    );

    return (<TopLevelGroup
        customButtons={enableToggle}
        description='Newsletter features are active, posts can be sent by email'
        keywords={keywords}
        navid='enable-newsletters'
        testId='enable-newsletters'
        title='Newsletter sending'
    >
        <SettingGroupContent>
            {(newslettersEnabled !== 'disabled' && !isDisabled) ? (
                <div className='w-full'>
                    <Inline align='center' gap='sm'>
                        <LucideIcon.Check className='size-4 text-state-success' />
                        <span>Enabled</span>
                    </Inline>
                </div>
            ) : (
                <div className='w-full'>
                    <Inline align='center' className='text-foreground' gap='sm'>
                        <LucideIcon.MailX className='size-4 text-muted-foreground' />
                        <span>Disabled</span>
                    </Inline>
                    {isDisabled &&
                    <Banner className='mt-6' size='sm' variant='default'>
                        Your <button className='underline!' type="button" onClick={() => {
                            updateRoute('members');
                        }}>Subscription access</button> is set to &lsquo;Nobody&rsquo;, which disables all newsletter sending. Change to &lsquo;Invite-only&rsquo; to send newsletters to existing members without allowing new signups.
                    </Banner>
                    }
                </div>
            )}
        </SettingGroupContent>
    </TopLevelGroup>);
};

export default withErrorBoundary(EnableNewsletters, 'Newsletter sending');
