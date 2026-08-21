import NavigationEditForm from './navigation/navigation-edit-form';
import useNavigationEditor, {type NavigationItem} from '@/settings/hooks/site/use-navigation-editor';
import useSettingGroup from '@/settings/hooks/use-setting-group';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFeatureFlag, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useGlobalData} from '@/settings/providers/global-data-context';
import {useCallback, useMemo, useState} from 'react';
import {useSettingsNavigation} from '@/settings/hooks/use-settings-navigation';

function NavigationModal() {
    const {updateRoute} = useSettingsNavigation();
    const handleError = useHandleError();
    const {mutateAsync: uploadImage} = useUploadImage();
    const {config} = useGlobalData();
    const {
        localSettings,
        updateSetting,
        saveState,
        handleSave,
        siteData
    } = useSettingGroup();

    const [navigationValue, secondaryNavigationValue, membersSignupAccess] = getSettingValues<string>(
        localSettings,
        ['navigation', 'secondary_navigation', 'members_signup_access']
    );
    const navigationIconsEnabled = useFeatureFlag('navigationIcons');
    const showIcon = navigationIconsEnabled;
    const showVisibility = navigationIconsEnabled && membersSignupAccess !== 'none';
    const showPaidVisibility = checkStripeEnabled(localSettings, config);

    const navigationItems = useMemo(() => JSON.parse(navigationValue || '[]') as NavigationItem[], [navigationValue]);
    const secondaryNavigationItems = useMemo(() => JSON.parse(secondaryNavigationValue || '[]') as NavigationItem[], [secondaryNavigationValue]);
    const setNavigationItems = useCallback((items: NavigationItem[]) => {
        updateSetting('navigation', JSON.stringify(items));
    }, [updateSetting]);
    const setSecondaryNavigationItems = useCallback((items: NavigationItem[]) => {
        updateSetting('secondary_navigation', JSON.stringify(items));
    }, [updateSetting]);

    const navigation = useNavigationEditor({
        items: navigationItems,
        setItems: setNavigationItems
    });

    const secondaryNavigation = useNavigationEditor({
        items: secondaryNavigationItems,
        setItems: setSecondaryNavigationItems
    });

    const [selectedTab, setSelectedTab] = useState('primary-nav');

    const uploadIcon = async (file: File) => {
        try {
            return getImageUrl(await uploadImage({file}));
        } catch (e) {
            const error = e as APIError;
            if (error.response?.status === 415) {
                error.message = 'Unsupported file type';
            }
            handleError(error);
        }
    };

    return (
        <SettingsModal
            buttonsDisabled={saveState === 'saving'}
            cancelLabel='Close'
            dirty={localSettings.some(setting => setting.dirty)}
            okLabel={saveState === 'saving' ? 'Saving...' : 'Save'}
            scrolling={true}
            size='lg'
            stickyFooter={true}
            testId='navigation-modal'
            title='Navigation'
            onClose={() => {
                updateRoute('navigation');
            }}
            onOk={async () => {
                if (navigation.validate() && secondaryNavigation.validate()) {
                    await handleSave();
                    updateRoute('navigation');
                }
            }}
        >
            <div className='mt-6 mb-1'>
                <Tabs value={selectedTab} variant='underline' onValueChange={setSelectedTab}>
                    <TabsList>
                        <TabsTrigger value='primary-nav'>Primary</TabsTrigger>
                        <TabsTrigger value='secondary-nav'>Secondary</TabsTrigger>
                    </TabsList>
                    <TabsContent value='primary-nav'>
                        <NavigationEditForm
                            baseUrl={siteData!.url}
                            idPrefix='primary-navigation'
                            navigation={navigation}
                            showIcon={showIcon}
                            showPaidVisibility={showPaidVisibility}
                            showVisibility={showVisibility}
                            uploadIcon={uploadIcon}
                        />
                    </TabsContent>
                    <TabsContent value='secondary-nav'>
                        <NavigationEditForm
                            baseUrl={siteData!.url}
                            idPrefix='secondary-navigation'
                            navigation={secondaryNavigation}
                            showIcon={showIcon}
                            showPaidVisibility={showPaidVisibility}
                            showVisibility={showVisibility}
                            uploadIcon={uploadIcon}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </SettingsModal>
    );
}

export default NavigationModal;
