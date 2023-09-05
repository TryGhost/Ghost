import AnnouncementBarPreview from './announcementBar/AnnouncementBarPreview';
import CheckboxGroup from '../../../admin-x-ds/global/form/CheckboxGroup';
import ColorIndicator from '../../../admin-x-ds/global/form/ColorIndicator';
import Form from '../../../admin-x-ds/global/form/Form';
import HtmlField from '../../../admin-x-ds/global/form/HtmlField';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import useRouting from '../../../hooks/useRouting';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {PreviewModalContent} from '../../../admin-x-ds/global/modal/PreviewModal';
import {getSettingValues} from '../../../api/settings';
import {showToast} from '../../../admin-x-ds/global/Toast';
import {useGlobalData} from '../../providers/GlobalDataProvider';

type SidebarProps = {
    announcementContent?: string;
    announcementTextHandler: (e: string) => void;
    accentColor?: string;
    announcementBackgroundColor?: string;
    toggleColorSwatch: (e:string) => void;
    toggleVisibility: (visibility: string, value: boolean) => void;
    visibility: string[];
};

const Sidebar: React.FC<SidebarProps> = ({
    announcementContent, 
    announcementTextHandler,
    accentColor,
    announcementBackgroundColor,
    toggleColorSwatch,
    toggleVisibility,
    visibility
}) => {
    const {config} = useGlobalData();

    return (
        <Form>
            <HtmlField
                config={config}
                nodes='MINIMAL_NODES'
                placeholder='Highlight breaking news, offers or updates'
                title='Announcement'
                value={announcementContent}
                onChange={announcementTextHandler}
            />
            <ColorIndicator
                isExpanded={false}
                picker={false}
                swatches={[
                    {
                        hex: '#08090c',
                        title: 'Dark',
                        value: 'dark'
                    },
                    {
                        hex: '#ffffff',
                        title: 'Light',
                        value: 'light'
                    },
                    {
                        hex: accentColor || '#ffdd00',
                        title: 'Accent',
                        value: 'accent'
                    }
                ]}
                swatchSize='lg'
                title='Background color'
                value={announcementBackgroundColor}
                onSwatchChange={(e) => {
                    toggleColorSwatch(e);
                }}
                onTogglePicker={() => {}}
            />
            <CheckboxGroup
                checkboxes={[
                    {
                        label: 'Logged out visitors',
                        onChange: (e) => {
                            toggleVisibility('visitors', e);
                        },
                        value: 'visitors',
                        checked: visibility.includes('visitors')
                    },
                    {
                        label: 'Free members',
                        onChange: (e) => {
                            toggleVisibility('free_members', e);
                        },
                        value: 'free_members',
                        checked: visibility.includes('free_members')
                    },
                    {
                        label: 'Paid members',
                        onChange: (e) => {
                            toggleVisibility('paid_members', e);
                        },
                        value: 'paid_members',
                        checked: visibility.includes('paid_members')
                    }
                ]}
                title='Visibility'
            />
        </Form>
    );
};

const AnnouncementBarModal: React.FC = () => {
    // API constraints - we are limited to "dark", "light" and "accent" colors
    const modal = NiceModal.useModal();
    // const {config} = useGlobalData();
    const {localSettings, updateSetting, handleSave} = useSettingGroup();
    const [announcementContent] = getSettingValues<string>(localSettings, ['announcement_content']);
    const [accentColor] = getSettingValues<string>(localSettings, ['accent_color']);
    const [announcementBackgroundColor] = getSettingValues<string>(localSettings, ['announcement_background']);
    const [announcementVisibility] = getSettingValues<string[]>(localSettings, ['announcement_visibility']);
    const visibilitySettings = JSON.parse(announcementVisibility?.toString() || '[]') as string[];

    const {updateRoute} = useRouting();

    const toggleColorSwatch = (e: string | null) => {
        updateSetting('announcement_background', e);
    };

    const toggleVisibility = (visibility: string, value: boolean) => {
        const index = visibilitySettings.indexOf(visibility);
        if (index === -1 && value) {
            visibilitySettings.push(visibility);
        } else {
            visibilitySettings.splice(index, 1);
        }
        updateSetting('announcement_visibility', JSON.stringify(visibilitySettings));
    };

    const sidebar = <Sidebar
        accentColor={accentColor}
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        announcementTextHandler={(e) => {
            updateSetting('announcement_content', e);
        }}
        toggleColorSwatch={toggleColorSwatch}
        toggleVisibility={toggleVisibility}
        visibility={announcementVisibility as string[]}
    />;

    return <PreviewModalContent
        afterClose={() => {
            modal.remove();
            updateRoute('announcement-bar');
        }}
        cancelLabel='Close'
        deviceSelector={false}
        dirty={false}
        okLabel='Save'
        preview={<AnnouncementBarPreview />}
        previewBgColor='greygradient'
        sidebar={sidebar}
        testId='announcement-bar-modal'
        title='Announcement bar'
        titleHeadingLevel={5}
        onOk={async () => {
            if (await handleSave()) {
                modal.remove();
                updateRoute('announcement-bar');
            } else {
                showToast({
                    type: 'pageError',
                    message: 'An error occurred while saving your changes. Please try again.'
                });
            }
        }}
    />;
};

export default NiceModal.create(AnnouncementBarModal);
