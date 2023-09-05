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
};

const Sidebar: React.FC<SidebarProps> = ({
    announcementContent, 
    announcementTextHandler,
    accentColor,
    announcementBackgroundColor
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
                        title: 'Dark'
                    },
                    {
                        hex: '#ffffff',
                        title: 'Light'
                    },
                    {
                        hex: accentColor || '#ffdd00',
                        title: 'Accent'
                    }
                ]}
                swatchSize='lg'
                title='Background color'
                value={announcementBackgroundColor}
                onSwatchChange={(e) => {
                    console.log(e);
                }}
                onTogglePicker={() => {}}
            />
            <CheckboxGroup
                checkboxes={[
                    {
                        label: 'Logged out visitors',
                        onChange: () => {},
                        value: ''
                    },
                    {
                        label: 'Free members',
                        onChange: () => {},
                        value: ''
                    },
                    {
                        label: 'Paid members',
                        onChange: () => {},
                        value: ''
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

    const {updateRoute} = useRouting();

    const sidebar = <Sidebar
        accentColor={accentColor}
        announcementBackgroundColor={announcementBackgroundColor}
        announcementContent={announcementContent}
        announcementTextHandler={(e) => {
            updateSetting('announcement_content', e);
        }}
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
