import NavigationEditForm from './navigation/navigation-edit-form';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useNavigationEditor, {type NavigationItem} from '../../../hooks/site/use-navigation-editor';
import useSettingGroup from '../../../hooks/use-setting-group';
import {SettingsModal} from '@tryghost/shade/patterns';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useMemo, useState} from 'react';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const NavigationModal = NiceModal.create(() => {
    const modal = useModal();
    const {updateRoute} = useRouting();
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
            afterClose={() => {
                updateRoute('navigation');
            }}
            buttonsDisabled={saveState === 'saving'}
            cancelLabel='Close'
            dirty={localSettings.some(setting => setting.dirty)}
            okLabel={saveState === 'saving' ? 'Saving...' : 'Save'}
            scrolling={true}
            size='lg'
            stickyFooter={true}
            testId='navigation-modal'
            title='Navigation'
            onOk={async () => {
                if (navigation.validate() && secondaryNavigation.validate()) {
                    await handleSave();
                    modal.remove();
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
});

export default NavigationModal;
