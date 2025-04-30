import React from 'react';
import trackEvent from '../../../../utils/analytics';
import {ConfigResponseType, configDataType} from '@tryghost/admin-x-framework/api/config';
import {Toggle} from '@tryghost/admin-x-design-system';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';

const FeatureToggle: React.FC<{ flag: string; label?: string; }> = ({label, flag}) => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const {mutateAsync: editSettings} = useEditSettings();
    const client = useQueryClient();
    const handleError = useHandleError();

    return <Toggle checked={labs[flag]} label={label} labelClasses='sr-only' name={`feature-${flag}`} onChange={async () => {
        const newValue = !labs[flag];
        try {
            await editSettings([{
                key: 'labs',
                value: JSON.stringify({...labs, [flag]: newValue})
            }]);
            trackEvent('Feature Toggled', {state: newValue ? 'on' : 'off', feature: flag});
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
