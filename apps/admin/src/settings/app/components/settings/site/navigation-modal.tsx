import NavigationEditForm from './navigation/navigation-edit-form';
import useNavigationEditor, {type NavigationItem} from '@/settings/app/hooks/site/use-navigation-editor';
import useSettingGroup from '@/settings/app/hooks/use-setting-group';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo, useState} from 'react';
import {useSettingsNavigation} from '@/settings/app/hooks/use-settings-navigation';

function NavigationModal() {
    const {updateRoute} = useSettingsNavigation();
    const {
        localSettings,
        updateSetting,
        saveState,
        handleSave,
        siteData
    } = useSettingGroup();

    const [navigationValue, secondaryNavigationValue] = getSettingValues<string>(
        localSettings,
        ['navigation', 'secondary_navigation']
    );
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
                    <TabsContent value='primary-nav'><NavigationEditForm baseUrl={siteData!.url} navigation={navigation} /></TabsContent>
                    <TabsContent value='secondary-nav'><NavigationEditForm baseUrl={siteData!.url} navigation={secondaryNavigation} /></TabsContent>
                </Tabs>
            </div>
        </SettingsModal>
    );
}

export default NavigationModal;
