import NavigationEditForm from './navigation/navigation-edit-form';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useNavigationEditor, {type NavigationItem} from '../../../hooks/site/use-navigation-editor';
import useSettingGroup from '../../../hooks/use-setting-group';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {ButtonGroup, type ButtonProps, Modal, TabView, confirmIfDirty} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useGlobalData} from '../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

const NavigationModal = NiceModal.create(() => {
    const modal = useModal();
    const {updateRoute} = useRouting();
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

    const [navigationItems, secondaryNavigationItems, membersSignupAccess] = getSettingValues<string>(
        localSettings,
        ['navigation', 'secondary_navigation', 'members_signup_access']
    );
    const showVisibility = membersSignupAccess !== 'none';
    const showPaidVisibility = checkStripeEnabled(localSettings, config);
    const parseNavigationItems = (value?: string) => JSON.parse(value || '[]') as NavigationItem[];

    const navigation = useNavigationEditor({
        items: parseNavigationItems(navigationItems),
        setItems: (items) => {
            updateSetting('navigation', JSON.stringify(items));
        }
    });

    const secondaryNavigation = useNavigationEditor({
        items: parseNavigationItems(secondaryNavigationItems),
        setItems: items => updateSetting('secondary_navigation', JSON.stringify(items))
    });

    const [selectedTab, setSelectedTab] = useState('primary-nav');
    const isDirty = localSettings.some(setting => setting.dirty);

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

    const handleClose = () => {
        confirmIfDirty(isDirty, () => {
            modal.remove();
            updateRoute('navigation');
        });
    };

    const handleSaveNavigation = async () => {
        if (navigation.validate() && secondaryNavigation.validate()) {
            await handleSave();
            modal.remove();
            updateRoute('navigation');
        }
    };

    const buttons: ButtonProps[] = [
        {
            key: 'cancel-modal',
            label: 'Close',
            color: 'outline',
            testId: 'cancel-modal',
            disabled: saveState === 'saving',
            onClick: handleClose
        },
        {
            key: 'ok-modal',
            label: saveState === 'saving' ? 'Saving...' : 'Save',
            color: 'black',
            className: 'min-w-[80px]',
            testId: 'ok-modal',
            disabled: saveState === 'saving',
            onClick: () => {
                void handleSaveNavigation();
            }
        }
    ];

    return (
        <Modal
            afterClose={() => {
                updateRoute('navigation');
            }}
            dirty={isDirty}
            footer={false}
            scrolling={true}
            size='lg'
            testId='navigation-modal'
            title='Navigation'
            topRightContent={<ButtonGroup buttons={buttons} />}
            onCancel={handleClose}
            onOk={handleSaveNavigation}
        >
            <div className='mt-6 pb-7'>
                <TabView
                    selectedTab={selectedTab}
                    tabs={[
                        {
                            id: 'primary-nav',
                            title: 'Primary',
                            contents: <NavigationEditForm baseUrl={siteData!.url} idPrefix='primary-navigation' navigation={navigation} showPaidVisibility={showPaidVisibility} showVisibility={showVisibility} uploadIcon={uploadIcon} />
                        },
                        {
                            id: 'secondary-nav',
                            title: 'Secondary',
                            contents: <NavigationEditForm baseUrl={siteData!.url} idPrefix='secondary-navigation' navigation={secondaryNavigation} showPaidVisibility={showPaidVisibility} showVisibility={showVisibility} uploadIcon={uploadIcon} />
                        }
                    ]}
                    onTabChange={setSelectedTab}
                />
            </div>
        </Modal>
    );
});

export default NavigationModal;
