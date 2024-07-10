import NavigationEditForm from './navigation/NavigationEditForm';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useNavigationEditor, {NavigationItem} from '../../../hooks/site/useNavigationEditor';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {Modal, TabView} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

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

    const [navigationItems, secondaryNavigationItems] = getSettingValues<string>(
        localSettings,
        ['navigation', 'secondary_navigation']
    ).map(value => JSON.parse(value || '[]') as NavigationItem[]);

    const navigation = useNavigationEditor({
        items: navigationItems,
        setItems: (items) => {
            updateSetting('navigation', JSON.stringify(items));
        }
    });

    const secondaryNavigation = useNavigationEditor({
        items: secondaryNavigationItems,
        setItems: items => updateSetting('secondary_navigation', JSON.stringify(items))
    });

    const [selectedTab, setSelectedTab] = useState('primary-nav');

    return (
        <Modal
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
            <div className='mb-1 mt-6'>
                <TabView
                    selectedTab={selectedTab}
                    tabs={[
                        {
                            id: 'primary-nav',
                            title: 'Primary',
                            contents: <NavigationEditForm baseUrl={siteData!.url} navigation={navigation} />
                        },
                        {
                            id: 'secondary-nav',
                            title: 'Secondary',
                            contents: <NavigationEditForm baseUrl={siteData!.url} navigation={secondaryNavigation} />
                        }
                    ]}
                    onTabChange={setSelectedTab}
                />
            </div>
        </Modal>
    );
});

export default NavigationModal;
