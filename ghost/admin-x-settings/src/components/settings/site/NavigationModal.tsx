import Heading from '../../../admin-x-ds/global/Heading';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NavigationEditor from './navigation/NavigationEditor';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
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
            size='full'
            title='Navigation'
            onCancel={() => modal.remove()}
            onOk={async () => {
                await handleSave();
                modal.remove();
            }}
        >
            <Heading className="mt-6" level={6}>Primary navigation</Heading>
            <NavigationEditor baseUrl={siteData!.url} items={navigation} setItems={items => updateSetting('navigation', JSON.stringify(items))} />
            <Heading level={6}>Secondary navigation</Heading>
            <NavigationEditor baseUrl={siteData!.url} items={secondaryNavigation} setItems={items => updateSetting('secondary_navigation', JSON.stringify(items))} />
        </Modal>
    );
});

export default NavigationModal;
