import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Banner} from '@tryghost/shade/components';
import {Icon, SettingGroupContent, Toggle} from '@tryghost/admin-x-design-system';
import {Inline} from '@tryghost/shade/primitives';
import {type Setting, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
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

    const handleToggleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const updates: Setting[] = [
            {key: 'editor_default_email_recipients', value: (e.target.checked ? 'visibility' : 'disabled')}
        ];

        if (!e.target.checked) {
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
            <Toggle
                checked={newslettersEnabled !== 'disabled' && !isDisabled}
                direction='rtl'
                disabled={isDisabled}
                onChange={handleToggleChange}
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
        <SettingGroupContent
            columns={1}
            values={[
                {
                    key: 'private',
                    value: (newslettersEnabled !== 'disabled' && !isDisabled) ? (<div className='w-full'>
                        <Inline align='center' gap='sm'>
                            <Icon colorClass='text-state-success' name='check' size='sm' />
                            <span>Enabled</span>
                        </Inline>
                    </div>) :
                        <div className='w-full'>
                            <Inline align='center' className='text-foreground' gap='sm'>
                                <Icon colorClass='text-muted-foreground' name='mail-block' size='sm' />
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
                }
            ]}
        />
    </TopLevelGroup>);
};

export default withErrorBoundary(EnableNewsletters, 'Newsletter sending');
