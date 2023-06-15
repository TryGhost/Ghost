import Modal from '../../../admin-x-ds/global/modal/Modal';
import NavigationEditor from './navigation/NavigationEditor';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TabView from '../../../admin-x-ds/global/TabView';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {NavigationItem} from './navigation/NavigationItemEditor';
import {getSettingValues} from '../../../utils/helpers';

const NavigationModal = NiceModal.create(() => {
    const modal = useModal();

    const {
        localSettings,
        updateSetting,
        saveState,
        handleSave,
        siteData
    } = useSettingGroup();

    const [navigation, secondaryNavigation] = getSettingValues<string>(
        localSettings,
        ['navigation', 'secondary_navigation']
    ).map(value => JSON.parse(value || '[]') as NavigationItem[]);

    return (
        <Modal
            buttonsDisabled={saveState === 'saving'}
            scrolling={true}
            size='lg'
            stickyFooter={true}
            title='Navigation'
            onCancel={() => modal.remove()}
            onOk={async () => {
                await handleSave();
                modal.remove();
            }}
        >
            <div className='-mb-8 mt-6'>
                <TabView
                    tabs={[
                        {
                            id: 'primary-nav',
                            title: 'Primary navigation',
                            contents: <NavigationEditor baseUrl={siteData!.url} items={navigation} setItems={items => updateSetting('navigation', JSON.stringify(items))} />
                        },
                        {
                            id: 'secondary-nav',
                            title: 'Secondary navigation',
                            contents: <NavigationEditor baseUrl={siteData!.url} items={secondaryNavigation} setItems={items => updateSetting('secondary_navigation', JSON.stringify(items))} />
                        }
                    ]}
                />
            </div>
        </Modal>
    );
});

export default NavigationModal;
