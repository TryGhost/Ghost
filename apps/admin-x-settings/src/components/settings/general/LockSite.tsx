import Icon from '../../../admin-x-ds/global/Icon';
import Link from '../../../admin-x-ds/global/Link';
import React from 'react';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getSettingValues} from '../../../utils/helpers';

const LockSite: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [passwordEnabled, password] = getSettingValues(localSettings, ['is_private', 'password']) as [boolean, string];

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('is_private', e.target.checked);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('password', e.target.value);
    };

    const values = (
        <SettingGroupContent
            values={[
                {
                    key: 'private',
                    value: passwordEnabled ? (
                        <div className='flex items-center gap-1'>
                            <Icon colorClass='text-yellow' name='lock-locked' size='sm' />
                            <span>Your site is password protected</span>
                        </div>
                    ) : (
                        <div className='flex items-center gap-1 text-grey-900'>
                            <Icon colorClass='text-black' name='lock-unlocked' size='sm' />
                            <span>Your site is not password protected</span>
                        </div>
                    )
                }
            ]}
        />
    );

    const hint = (
        <>A private RSS feed is available at <Link href="http://localhost:2368/51aa059ba6eb50c24c14047d4255ac/rss">http://localhost:2368/51aa059ba6eb50c24c14047d4255ac/rss</Link></>
    );

    const inputs = (
        <SettingGroupContent>
            <Toggle
                checked={passwordEnabled}
                direction='rtl'
                hint='All search engine optimization and social features will be disabled.'
                label='Enable password protection'
                onChange={handleToggleChange}
            />
            {passwordEnabled &&
                <TextField
                    hint={hint}
                    placeholder="Enter password"
                    title="Site password"
                    value={password}
                    hideTitle
                    onChange={handlePasswordChange}
                />
            }
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description='Enable protection with a simple shared password.'
            isEditing={isEditing}
            keywords={keywords}
            navid='locksite'
            saveState={saveState}
            testId='locksite'
            title='Make site private'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputs : values}
        </SettingGroup>
    );
};

export default LockSite;
