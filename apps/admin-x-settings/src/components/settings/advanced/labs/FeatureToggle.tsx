import React from 'react';
import {ConfigResponseType, configDataType, getSettingValue, useEditSettings, useHandleError} from '@tryghost/admin-x-framework';
import {Toggle} from '@tryghost/admin-x-design-system';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useQueryClient} from '@tanstack/react-query';

const FeatureToggle: React.FC<{ flag: string; label?: string; }> = ({label, flag}) => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const {mutateAsync: editSettings} = useEditSettings();
    const client = useQueryClient();
    const handleError = useHandleError();

    return <Toggle checked={labs[flag]} label={label} labelClasses='sr-only' onChange={async () => {
        const newValue = !labs[flag];
        try {
            await editSettings([{
                key: 'labs',
                value: JSON.stringify({...labs, [flag]: newValue})
            }]);
            client.setQueriesData([configDataType], current => ({
                config: {
                    ...(current as ConfigResponseType).config,
                    labs: {
                        ...(current as ConfigResponseType).config.labs,
                        [flag]: newValue
                    }
                }
            }));
        } catch (e) {
            handleError(e);
        }
    }} />;
};

export default FeatureToggle;
