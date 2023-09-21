import Icon from '../../../admin-x-ds/global/Icon';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import handleError from '../../../utils/handleError';
import {Setting, getSettingValues, useEditSettings} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const EnableNewsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();

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
                checked={isDisabled ? false : newslettersEnabled !== 'disabled'}
                direction='rtl'
                disabled={isDisabled}
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
            values={[
                {
                    key: 'private',
                    value: (!isDisabled && newslettersEnabled !== 'disabled') ? (
                        <div className='flex items-center gap-2'>
                            <Icon colorClass='text-green' name='check' size='sm' />
                            <span>Enabled</span>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2 text-grey-900'>
                            <Icon colorClass='text-grey-600' name='mail-block' size='sm' />
                            <span>
                                Disabled
                                {isDisabled && ' by Access settings'}
                            </span>
                        </div>
                    )
                }
            ]}
        />
    </SettingGroup>);
};

export default EnableNewsletters;
