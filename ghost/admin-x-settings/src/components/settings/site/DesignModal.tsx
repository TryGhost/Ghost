import BrandSettings, {BrandSettingValues} from './designAndBranding/BrandSettings';
import ConfirmationModal from '../../../admin-x-ds/global/ConfirmationModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useContext, useEffect, useState} from 'react';
import StickyFooter from '../../../admin-x-ds/global/StickyFooter';
import TabView, {Tab} from '../../../admin-x-ds/global/TabView';
import ThemePreview from './designAndBranding/ThemePreivew';
import ThemeSettings from './designAndBranding/ThemeSettings';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {CustomThemeSetting, SettingValue} from '../../../types/api';
import {PreviewModalContent} from '../../../admin-x-ds/global/PreviewModal';
import {SelectOption} from '../../../admin-x-ds/global/Select';
import {ServicesContext} from '../../providers/ServiceProvider';

const Sidebar: React.FC<{
    brandSettings: BrandSettingValues
    updateBrandSetting: (key: string, value: SettingValue) => void
    themeSettingSections: Array<{id: string, title: string, settings: CustomThemeSetting[]}>
    updateThemeSetting: (updated: CustomThemeSetting) => void
}> = ({brandSettings,updateBrandSetting,themeSettingSections,updateThemeSetting}) => {
    const tabs: Tab[] = [
        {
            id: 'brand',
            title: 'Brand',
            contents: <BrandSettings updateSetting={updateBrandSetting} values={brandSettings} />
        },
        ...themeSettingSections.map(({id, title, settings}) => ({
            id,
            title,
            contents: <ThemeSettings settings={settings} updateSetting={updateThemeSetting} />
        }))
    ];

    return (
        <>
            <div className='p-7'>
                <TabView tabs={tabs} />
            </div>
            <StickyFooter>
                <button className='flex w-full cursor-pointer flex-col px-7' type='button' onClick={() => {}}>
                    <strong>Change theme</strong>
                    <span className='text-sm text-grey-600'>Casper</span>
                </button>
            </StickyFooter>
        </>
    );
};

const DesignModal: React.FC = () => {
    const modal = useModal();

    const {api} = useContext(ServicesContext);
    const [themeSettings, setThemeSettings] = useState<Array<CustomThemeSetting & { dirty?: boolean }>>([]);

    useEffect(() => {
        api.customThemeSettings.browse().then((response) => {
            setThemeSettings(response.custom_theme_settings);
        });
    }, [api]);

    const {
        saveState,
        handleSave,
        updateSetting,
        getSettingValues,
        dirty
    } = useSettingGroup({
        onSave: async () => {
            if (themeSettings.some(setting => setting.dirty)) {
                const response = await api.customThemeSettings.edit(themeSettings);
                setThemeSettings(response.custom_theme_settings);
            }
        }
    });
    const [description, accentColor, icon, logo, coverImage] = getSettingValues(['description', 'accent_color', 'icon', 'logo', 'cover_image']) as string[];

    const themeSettingGroups = themeSettings.reduce((groups, setting) => {
        const group = (setting.group === 'homepage' || setting.group === 'post') ? setting.group : 'site-wide';

        return {
            ...groups,
            [group]: (groups[group] || []).concat(setting)
        };
    }, {} as {[key: string]: CustomThemeSetting[] | undefined});

    const themeSettingSections = Object.entries(themeSettingGroups).map(([id, settings]) => ({
        id,
        settings: settings || [],
        title: id === 'site-wide' ? 'Site wide' : (id === 'homepage' ? 'Homepage' : 'Post')
    }));

    const updateThemeSetting = (updated: CustomThemeSetting) => {
        setThemeSettings(themeSettings.map(setting => (
            setting.key === updated.key ? {...updated, dirty: true} : setting
        )));
    };

    const urlOptions: SelectOption[] = [
        {value: 'homepage', label: 'Homepage'},
        {value: 'post', label: 'Post'}
    ];

    const onSelectURL = (url: string) => {
        alert(url);
    };

    return <PreviewModalContent
        buttonsDisabled={saveState === 'saving'}
        cancelLabel='Close'
        okLabel='Save'
        preview={
            <ThemePreview
                settings={{
                    description,
                    accentColor,
                    icon,
                    logo,
                    coverImage,
                    themeSettings
                }}
            />
        }
        previewToolbarURLs={urlOptions}
        sidebar={<Sidebar
            brandSettings={{description, accentColor, icon, logo, coverImage}}
            themeSettingSections={themeSettingSections}
            updateBrandSetting={updateSetting}
            updateThemeSetting={updateThemeSetting}
        />}
        sidebarPadding={false}
        title='Design'
        onCancel={() => {
            if (dirty || themeSettings.some(setting => setting.dirty)) {
                NiceModal.show(ConfirmationModal, {
                    title: 'Are you sure you want to leave this page?',
                    prompt: (
                        <>
                            <p>Hey there! It looks like you didn&lsquo;t save the changes you made.</p>
                            <p>Save before you go!</p>
                        </>
                    ),
                    okLabel: 'Leave',
                    okColor: 'red',
                    onOk: (confirmModal) => {
                        confirmModal?.remove();
                        modal.remove();
                    },
                    cancelLabel: 'Stay'
                });
            } else {
                modal.remove();
            }
        }}
        onOk={async () => {
            await handleSave();
            // modal.remove();
        }}
        onSelectURL={onSelectURL}
    />;
};

export default NiceModal.create(DesignModal);
