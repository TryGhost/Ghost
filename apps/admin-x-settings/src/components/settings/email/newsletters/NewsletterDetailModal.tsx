import Form from '../../../../admin-x-ds/global/form/Form';
import NiceModal from '@ebay/nice-modal-react';

import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import Icon from '../../../../admin-x-ds/global/Icon';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import NewsletterPreview from './NewsletterPreview';
import React, {useState} from 'react';
import Select, {SelectOption} from '../../../../admin-x-ds/global/form/Select';
import StickyFooter from '../../../../admin-x-ds/global/StickyFooter';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
// import {ServicesContext} from '../../providers/ServiceProvider';
// import {SettingsContext} from '../../providers/SettingsProvider';
// import {getHomepageUrl, getSettingValues} from '../../../utils/helpers';

interface NewsletterDetailModalProps {

}

// const REPLY_TO_EMAILS = [
//     {label: 'Newsletter address (noreply@localhost)', value: 'noreply@localhost'},
//     {label: 'Support address (noreply@localhost)', value: 'noreply@localhost'}
// ];

const selectOptions: SelectOption[] = [
    {value: 'option-1', label: 'Option 1'},
    {value: 'option-2', label: 'Option 2'}
];

const Sidebar: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('generalSettings');
    const values = {
        HEADER: ''
    };

    const tabs: Tab[] = [
        {
            id: 'generalSettings',
            title: 'General',
            contents: <Form gap="sm" marginTop>
                <Heading className="mt-5" level={5}>Name and description</Heading>
                <TextField placeholder="Weekly Roundup" title="Name"></TextField>
                <TextArea clearBg={false} rows={2} title="Description"></TextArea>

                <Heading className="mt-5" level={5}>Email addresses</Heading>
                <TextField placeholder="Ghost" title="Sender name"></TextField>
                <TextField placeholder="noreply@localhost" title="Sender email address"></TextField>
                <Select options={selectOptions} title="Reply-to email" onSelect={(value: string) => {
                    alert(value);
                }}/>

                <Heading className="mt-5" level={5}>Member settings</Heading>
                <Toggle
                    label='Subscribe new members on signup'
                    labelStyle='value'
                />
            </Form>
        },
        {
            id: 'design',
            title: 'Design',
            contents: <Form gap="sm" marginTop>
                <Heading level={5}>Header</Heading>
                <div>
                    <div>
                        <Heading className="mb-2" level={6}>Header image</Heading>
                    </div>
                    <div className='flex-column flex gap-1'>
                        <ImageUpload
                            deleteButtonClassName='!top-1 !right-1'
                            height={values.HEADER ? '66px' : '64px'}
                            id='logo'
                            imageURL={values.HEADER || ''}
                            onDelete={() => {
                                alert();
                            }}
                            onUpload={() => {
                                alert();
                            }}
                        >
                        Upload header image
                        </ImageUpload>
                        <Hint>Optional, recommended size 1200x600</Hint>
                    </div>
                </div>
                <Toggle
                    direction="rtl"
                    label='Publication title'
                    labelStyle='value'
                />
                <Toggle
                    direction="rtl"
                    label='Newsletter name'
                    labelStyle='value'
                />

                <Heading className="mt-5" level={5}>Body</Heading>
                <Toggle
                    direction="rtl"
                    label='Title'
                    labelStyle='heading'
                />
                <Select containerClassName="-mt-[16px]" options={selectOptions} onSelect={(value: string) => {
                    alert(value);
                }}/>
                <div className="flex items-end">
                    <div className="w-full pr-4">
                        <Select containerClassName="" options={selectOptions} title="Body style" onSelect={(value: string) => {
                            alert(value);
                        }}/>
                    </div>
                    <ButtonGroup buttons={[
                        {
                            icon: 'align-left',
                            label: 'Align left',
                            hideLabel: true,
                            link: false,
                            size: 'sm',
                            iconColorClass: 'text-grey-500'
                        },
                        {
                            icon: 'align-center',
                            label: 'Align center',
                            hideLabel: true,
                            link: false,
                            size: 'sm',
                            iconColorClass: 'text-grey-900'
                        }
                    ]}
                    className="mb-1 !gap-0"
                    />
                </div>
                <Toggle
                    direction="rtl"
                    label='Feature image'
                    labelStyle='value'
                />

                <Heading className="mt-5" level={5}>Footer</Heading>
                <Toggle
                    direction="rtl"
                    label='Ask your readers for feedback'
                    labelStyle='value'
                />
                <Toggle
                    direction="rtl"
                    label='Add a link to your comments'
                    labelStyle='value'
                />
                <Toggle
                    direction="rtl"
                    label='Share your latest posts'
                    labelStyle='value'
                />
                <Toggle
                    direction="rtl"
                    label='Show subscription details'
                    labelStyle='value'
                />
                <TextArea clearBg={false} hint="Any extra information or legal text" rows={2} title="Email footer"></TextArea>
            </Form>
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='flex h-full flex-col justify-between'>
            <div className='px-7 pb-7 pt-5'>
                <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
            </div>
            <StickyFooter height={96}>
                <div className='flex w-full items-start px-7'>
                    <span>
                        <Icon className='-mt-[1px] mr-2' colorClass='text-red' name='heart'/>
                    </span>
                    <Form marginBottom={false}>
                        <Toggle
                            checked={true}
                            direction='rtl'
                            hint='Show you’re a part of the indie publishing movement with a small badge in the footer'
                            label='Promote independent publishing'
                            labelStyle='value'
                        />
                    </Form>
                </div>
            </StickyFooter>
        </div>
    );
};

const preview = <NewsletterPreview/>;

const NewsletterDetailModal: React.FC<NewsletterDetailModalProps> = () => {
    const sidebar = <Sidebar/>;

    return <PreviewModalContent
        deviceSelector={false}
        okLabel={'Save & close'}
        preview={preview}
        previewBgColor={'grey'}
        previewToolbar={false}
        sidebar={sidebar}
        sidebarPadding={false}
        testId='newsletter-modal'
        title='Newsletter'
    />;
};

export default NiceModal.create(NewsletterDetailModal);