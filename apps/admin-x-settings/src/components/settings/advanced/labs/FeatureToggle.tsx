import React from 'react';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {ConfigResponseType, configDataType} from '../../../../api/config';
import {getSettingValue, useEditSettings} from '../../../../api/settings';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useQueryClient} from '@tanstack/react-query';
import {useServices} from '../../../providers/ServiceProvider';

const FeatureToggle: React.FC<{ flag: string; }> = ({flag}) => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const {mutateAsync: editSettings} = useEditSettings();
    const client = useQueryClient();
    const {toggleFeatureFlag} = useServices();

    return <Toggle checked={labs[flag]} testId={`${flag}-lab-item`} onChange={async () => {
        const newValue = !labs[flag];
        await editSettings([{
            key: 'labs',
            value: JSON.stringify({...labs, [flag]: newValue})
        }]);
        toggleFeatureFlag(flag, newValue);
        client.setQueriesData([configDataType], current => ({
            config: {
                ...(current as ConfigResponseType).config,
                labs: {
                    ...(current as ConfigResponseType).config.labs,
                    [flag]: newValue
                }
            }
        }));
    }} />;
};

export default FeatureToggle;
