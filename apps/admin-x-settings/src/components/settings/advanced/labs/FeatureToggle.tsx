import React from 'react';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import useHandleError from '../../../../utils/api/handleError';
import {ConfigResponseType, configDataType} from '../../../../api/config';
import {getSettingValue, useEditSettings} from '../../../../api/settings';
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
