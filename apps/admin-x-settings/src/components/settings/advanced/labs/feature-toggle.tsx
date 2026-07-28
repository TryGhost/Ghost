import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import trackEvent from '../../../../utils/analytics';
import {type ConfigResponseType, configDataType} from '@tryghost/admin-x-framework/api/config';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Switch} from '@tryghost/shade/components';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';

type ConfirmationProps = {
    title: string;
    prompt: React.ReactNode;
    okLabel: string;
    okRunningLabel?: string;
};

type FeatureToggleProps = {
    flag: string;
    label?: string;
    disabled?: boolean;
    confirmation?: ConfirmationProps;
};

type FeatureToggleConfirmationModalProps = ConfirmationProps & {
    onConfirm: () => Promise<boolean>;
};

const FeatureToggleConfirmationModal = NiceModal.create<FeatureToggleConfirmationModalProps>(({
    title,
    prompt,
    okLabel,
    okRunningLabel = 'Enabling...',
    onConfirm
}) => {
    const modal = useModal();
    const [isRunning, setIsRunning] = React.useState(false);

    const handleCancel = () => {
        modal.remove();
    };

    const handleConfirm = async () => {
        setIsRunning(true);

        try {
            const confirmed = await onConfirm();
            if (confirmed) {
                modal.remove();
            }
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <SettingsModal
            backDropClick={false}
            buttonsDisabled={isRunning}
            cancelLabel='Cancel'
            okLabel={isRunning ? okRunningLabel : okLabel}
            testId='feature-toggle-confirmation-modal'
            title={title}
            width={540}
            onCancel={handleCancel}
            onOk={handleConfirm}
        >
            <div className='py-4'>{prompt}</div>
        </SettingsModal>
    );
});

const FeatureToggle: React.FC<FeatureToggleProps> = ({label, flag, disabled, confirmation}) => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const {mutateAsync: editSettings} = useEditSettings();
    const client = useQueryClient();
    const handleError = useHandleError();
    const isEnabled = !!labs[flag];

    const saveFeatureValue = async (newValue: boolean) => {
        try {
            await editSettings([{
                key: 'labs',
                value: JSON.stringify({...labs, [flag]: newValue})
            }]);
            trackEvent('Feature Toggled', {state: newValue ? 'on' : 'off', feature: flag});
            client.setQueriesData({queryKey: [configDataType]}, current => ({
                config: {
                    ...(current as ConfigResponseType).config,
                    labs: {
                        ...(current as ConfigResponseType).config.labs,
                        [flag]: newValue
                    }
                }
            }));
            return true;
        } catch (e) {
            handleError(e);
            return false;
        }
    };

    return <Switch aria-label={label || flag} checked={isEnabled} disabled={disabled} name={`feature-${flag}`} onCheckedChange={async (newValue) => {

        if (confirmation && newValue) {
            NiceModal.show(FeatureToggleConfirmationModal, {
                ...confirmation,
                onConfirm: () => saveFeatureValue(newValue)
            });
            return;
        }

        await saveFeatureValue(newValue);
    }} />;
};

export default FeatureToggle;
