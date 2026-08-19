import React, {useState} from 'react';
import trackEvent from '@/settings/utils/analytics';
import {type ConfigResponseType, configDataType} from '@tryghost/admin-x-framework/api/config';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Switch} from '@tryghost/shade/components';
import {getSettingValue, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '@/settings/providers/global-data-context';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useQueryClient} from '@tanstack/react-query';
import {DialogPortal} from '@/settings/providers/dialog-portal';

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
    onClose: () => void;
};

const FeatureToggleConfirmationModal: React.FC<FeatureToggleConfirmationModalProps> = ({
    title,
    prompt,
    okLabel,
    okRunningLabel = 'Enabling...',
    onConfirm,
    onClose
}) => {
    const [isRunning, setIsRunning] = useState(false);

    const handleConfirm = async () => {
        setIsRunning(true);

        try {
            const confirmed = await onConfirm();
            if (confirmed) {
                onClose();
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
            onCancel={onClose}
            onClose={onClose}
            onOk={handleConfirm}
        >
            <div className='py-4'>{prompt}</div>
        </SettingsModal>
    );
};

const FeatureToggle: React.FC<FeatureToggleProps> = ({label, flag, disabled, confirmation}) => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}') as Record<string, boolean | undefined>;
    const {mutateAsync: editSettings} = useEditSettings();
    const client = useQueryClient();
    const handleError = useHandleError();
    const isEnabled = !!labs[flag];
    const [isConfirming, setIsConfirming] = useState(false);

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

    return <>
        <Switch aria-label={label || flag} checked={isEnabled} disabled={disabled} name={`feature-${flag}`} onCheckedChange={(newValue) => {
            if (confirmation && newValue) {
                setIsConfirming(true);
                return;
            }

            void saveFeatureValue(newValue);
        }} />
        {confirmation && isConfirming && (
            <DialogPortal>
                <FeatureToggleConfirmationModal
                    {...confirmation}
                    onClose={() => setIsConfirming(false)}
                    onConfirm={() => saveFeatureValue(true)}
                />
            </DialogPortal>
        )}
    </>;
};

export default FeatureToggle;
