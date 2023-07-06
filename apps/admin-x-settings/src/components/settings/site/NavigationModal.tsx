import Modal from '../../../admin-x-ds/global/modal/Modal';
import NavigationEditForm from './navigation/NavigationEditForm';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TabView from '../../../admin-x-ds/global/TabView';
import useNavigationEditor, {NavigationItem} from '../../../hooks/site/useNavigationEditor';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {getSettingValues} from '../../../utils/helpers';
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
            dirty={localSettings.some(setting => setting.dirty)}
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
            <div className='-mb-8 mt-6'>
                <TabView
                    selectedTab={selectedTab}
                    tabs={[
                        {
                            id: 'primary-nav',
                            title: 'Primary navigation',
                            contents: <NavigationEditForm baseUrl={siteData!.url} navigation={navigation} />
                        },
                        {
                            id: 'secondary-nav',
                            title: 'Secondary navigation',
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
