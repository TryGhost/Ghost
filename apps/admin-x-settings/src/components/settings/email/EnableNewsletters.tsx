import Banner from '../../../admin-x-ds/global/Banner';
import Icon from '../../../admin-x-ds/global/Icon';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import useHandleError from '../../../utils/api/handleError';
import useRouting from '../../../hooks/useRouting';
import {Setting, getSettingValues, useEditSettings} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {withErrorBoundary} from '../../../admin-x-ds/global/ErrorBoundary';

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
                checked={newslettersEnabled !== 'disabled'}
                direction='rtl'
                onChange={handleToggleChange}
            />
        </>
    );

    return (<SettingGroup
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
                    value: (newslettersEnabled !== 'disabled') ? (<div className='w-full'>
                        <div className='flex items-center gap-2'>
                            <Icon colorClass='text-green' name='check' size='sm' />
                            <span>Enabled</span>
                        </div>
                        {isDisabled &&
                        <Banner className='mt-6 text-sm' color='grey'>
                            Your <button className='!underline' type="button" onClick={() => {
                                updateRoute('members');
                            }}>Subscription access</button> is set to &lsquo;Nobody&rsquo;, only existing members will receive newsletters.
                        </Banner>
                        }
                    </div>) :
                        <div className='flex items-center gap-2 text-grey-900'>
                            <Icon colorClass='text-grey-600' name='mail-block' size='sm' />
                            <span>Disabled</span>
                        </div>
                }
            ]}
        />
    </SettingGroup>);
};

export default withErrorBoundary(EnableNewsletters, 'Newsletter sending');
