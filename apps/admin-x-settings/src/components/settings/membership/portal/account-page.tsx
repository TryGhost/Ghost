import React from 'react';
import TransistorSettings from './transistor-settings';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import {Form} from '@tryghost/admin-x-design-system';
import {type Setting, type SettingValue} from '@tryghost/admin-x-framework/api/settings';

const AccountPage: React.FC<{
    localSettings: Setting[]
    updateSetting: (key: string, setting: SettingValue) => void
    errors: Record<string, string | undefined>
    setError: (key: string, error: string | undefined) => void
}> = ({localSettings, updateSetting}) => {
    const hasTransistor = useFeatureFlag('transistor');

    if (!hasTransistor) {
        return null;
    }

    return (
        <div className='mt-7'><Form>
            <TransistorSettings
                localSettings={localSettings}
                updateSetting={updateSetting}
            />
        </Form></div>
    );
};

export default AccountPage;
