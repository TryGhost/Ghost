import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Radio, SettingGroupContent, withErrorBoundary} from '@tryghost/admin-x-design-system';

const DEFAULT_SPACER_IMAGE_URL_TEMPLATE = 'https://img.spacergif.org/v1/{width}x{height}/0a/spacer.png';
const SETTING_KEY = 'spacer_image_url_template';

type SpacerImageProviderMode = 'default' | 'disabled';

function getMode(urlTemplate: string): SpacerImageProviderMode {
    if (urlTemplate === DEFAULT_SPACER_IMAGE_URL_TEMPLATE) {
        return 'default';
    }

    return 'disabled';
}

const SpacerImageProvider: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const savedSetting = localSettings?.find(setting => setting.key === SETTING_KEY);
    const savedTemplate = savedSetting ? (savedSetting.value?.toString() ?? '') : DEFAULT_SPACER_IMAGE_URL_TEMPLATE;
    const providerMode = getMode(savedTemplate);

    const updateTemplate = (value: string) => {
        updateSetting(SETTING_KEY, value);

        if (!isEditing) {
            handleEditingChange(true);
        }
    };

    const handleModeChange = (value: string) => {
        if (value === 'default') {
            updateTemplate(DEFAULT_SPACER_IMAGE_URL_TEMPLATE);
        } else {
            updateTemplate('');
        }
    };

    return (
        <TopLevelGroup
            description='Choose whether Ghost uses transparent spacer images for video previews'
            headerClassName='max-w-[420px]'
            isEditing={isEditing}
            keywords={keywords}
            navid='spacer-image-provider'
            saveState={saveState}
            testId='spacer-image-provider'
            title='Video spacer images'
            hideEditButton
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            <SettingGroupContent columns={1}>
                <Radio
                    key={providerMode}
                    id='spacer-image-provider-mode'
                    options={[
                        {
                            label: 'Use Ghost default spacer images',
                            value: 'default',
                            hint: 'Load transparent spacer images from Ghost’s default provider.'
                        },
                        {
                            label: 'Disable spacer images',
                            value: 'disabled',
                            hint: 'Do not output spacer image URLs in rendered content.'
                        }
                    ]}
                    selectedOption={providerMode}
                    onSelect={handleModeChange}
                />
            </SettingGroupContent>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(SpacerImageProvider, 'Spacer image provider');
