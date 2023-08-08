import Icon from '../../../admin-x-ds/global/Icon';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import {Setting, getSettingValues, useEditSettings} from '../../../api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';

const EnableNewsletters: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();

    const [newslettersEnabled] = getSettingValues(settings, ['editor_default_email_recipients']) as [string];

    const handleToggleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const updates: Setting[] = [
            {key: 'editor_default_email_recipients', value: (e.target.checked ? 'visibility' : 'disabled')}
        ];

        if (!e.target.checked) {
            updates.push({key: 'editor_default_email_recipients_filter', value: null});
        }

        await editSettings(updates);
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
            values={[
                {
                    key: 'private',
                    value: newslettersEnabled !== 'disabled' ? (
                        <div className='flex items-center gap-2'>
                            <Icon colorClass='text-green' name='check' size='sm' />
                            <span>Enabled</span>
                        </div>
                    ) : (
                        <div className='flex items-center gap-2 text-grey-900'>
                            <Icon colorClass='text-grey-600' name='mail-block' size='sm' />
                            <span>Disabled</span>
                        </div>
                    )
                }
            ]}
        />
    </SettingGroup>);
};

export default EnableNewsletters;
