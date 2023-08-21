import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import HtmlField from '../../../../admin-x-ds/global/form/HtmlField';
import Icon from '../../../../admin-x-ds/global/Icon';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import NewsletterPreview from './NewsletterPreview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import Select, {SelectOption} from '../../../../admin-x-ds/global/form/Select';
import StickyFooter from '../../../../admin-x-ds/global/StickyFooter';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import ToggleGroup from '../../../../admin-x-ds/global/form/ToggleGroup';
import useForm from '../../../../hooks/useForm';
import useRouting from '../../../../hooks/useRouting';
import validator from 'validator';
import {Newsletter, useEditNewsletter} from '../../../../api/newsletters';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
import {fullEmailAddress} from '../../../../api/site';
import {getImageUrl, useUploadImage} from '../../../../api/images';
import {getSettingValues} from '../../../../api/settings';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {toast} from 'react-hot-toast';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

interface NewsletterDetailModalProps {
    newsletter: Newsletter
}

const Sidebar: React.FC<{
    newsletter: Newsletter;
    updateNewsletter: (fields: Partial<Newsletter>) => void;
    validate: () => void;
    errors: Record<string, string>;
    clearError: (field: string) => void;
}> = ({newsletter, updateNewsletter, validate, errors, clearError}) => {
    const {settings, siteData, config} = useGlobalData();
    const [membersSupportAddress] = getSettingValues<string>(settings, ['members_support_address']);
    const {mutateAsync: uploadImage} = useUploadImage();
    const [selectedTab, setSelectedTab] = useState('generalSettings');

    const replyToEmails = [
        {label: `Newsletter address (${fullEmailAddress(newsletter.sender_email || 'noreply', siteData)})`, value: 'newsletter'},
        {label: `Support address (${fullEmailAddress(membersSupportAddress || 'noreply', siteData)})`, value: 'support'}
    ];

    const fontOptions: SelectOption[] = [
        {value: 'serif', label: 'Elegant serif', className: 'font-serif'},
        {value: 'sans_serif', label: 'Clean sans-serif'}
    ];

    const tabs: Tab[] = [
        {
            id: 'generalSettings',
            title: 'General',
            contents:
            <>
                <Form className='mt-6' gap='sm' margins='lg' title='Name and description'>
                    <TextField
                        error={Boolean(errors.name)}
                        hint={errors.name}
                        placeholder="Weekly Roundup"
                        title="Name"
                        value={newsletter.name || ''}
                        onBlur={validate}
                        onChange={e => updateNewsletter({name: e.target.value})}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextArea rows={2} title="Description" value={newsletter.description || ''} onChange={e => updateNewsletter({description: e.target.value})} />
                </Form>
                <Form className='mt-6' gap='sm' margins='lg' title='Email addresses'>
                    <TextField placeholder="Ghost" title="Sender name" value={newsletter.sender_name || ''} onChange={e => updateNewsletter({sender_name: e.target.value})} />
                    <TextField
                        error={Boolean(errors.sender_email)}
                        hint={errors.sender_email}
                        placeholder="noreply@localhost"
                        title="Sender email address"
                        value={newsletter.sender_email || ''}
                        onBlur={validate}
                        onChange={e => updateNewsletter({sender_email: e.target.value})}
                        onKeyDown={() => clearError('sender_email')}
                    />
                    <Select options={replyToEmails} selectedOption={newsletter.sender_reply_to} title="Reply-to email" onSelect={value => updateNewsletter({sender_reply_to: value})}/>
                </Form>
                <Form className='mt-6' gap='sm' margins='lg' title='Member settings'>
                    <Toggle
                        checked={newsletter.subscribe_on_signup}
                        direction='rtl'
                        label='Subscribe new members on signup'
                        labelStyle='value'
                        onChange={e => updateNewsletter({subscribe_on_signup: e.target.checked})}
                    />
                </Form>
            </>
        },
        {
            id: 'design',
            title: 'Design',
            contents:
            <>
                <Form className='mt-6' gap='sm' margins='lg' title='Header'>
                    <div>
                        <div>
                            <Heading className="mb-2" level={6}>Header image</Heading>
                        </div>
                        <div className='flex-column flex gap-1'>
                            <ImageUpload
                                deleteButtonClassName='!top-1 !right-1'
                                height={newsletter.header_image ? '66px' : '64px'}
                                id='logo'
                                imageURL={newsletter.header_image || undefined}
                                onDelete={() => {
                                    updateNewsletter({header_image: null});
                                }}
                                onUpload={async (file) => {
                                    const imageUrl = getImageUrl(await uploadImage({file}));
                                    updateNewsletter({header_image: imageUrl});
                                }}
                            >
                        Upload header image
                            </ImageUpload>
                            <Hint>Optional, recommended size 1200x600</Hint>
                        </div>
                    </div>
                    <ToggleGroup>
                        <Toggle
                            checked={newsletter.show_header_title}
                            direction="rtl"
                            label='Publication title'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_header_title: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_header_name}
                            direction="rtl"
                            label='Newsletter name'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_header_name: e.target.checked})}
                        />
                    </ToggleGroup>
                </Form>

                <Form className='mt-6' gap='sm' margins='lg' title='Body'>
                    <Toggle
                        checked={newsletter.show_post_title_section}
                        direction="rtl"
                        label='Post title'
                        labelStyle='heading'
                        onChange={e => updateNewsletter({show_post_title_section: e.target.checked})}
                    />
                    <div className={newsletter.show_post_title_section ? 'mt-[-16px] flex items-end' : 'hidden'}>
                        <div className="w-full pr-4">
                            <Select
                                disabled={!newsletter.show_post_title_section}
                                options={fontOptions}
                                selectedOption={newsletter.title_font_category}
                                onSelect={value => updateNewsletter({title_font_category: value})}
                            />
                        </div>
                        <ButtonGroup buttons={[
                            {
                                icon: 'align-left',
                                label: 'Align left',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                color: newsletter.title_alignment === 'left' ? 'clear' : 'clear',
                                iconColorClass: newsletter.title_alignment === 'left' ? 'text-grey-900' : 'text-grey-500',
                                onClick: () => updateNewsletter({title_alignment: 'left'}),
                                disabled: !newsletter.show_post_title_section
                            },
                            {
                                icon: 'align-center',
                                label: 'Align center',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                color: newsletter.title_alignment === 'center' ? 'clear' : 'clear',
                                iconColorClass: newsletter.title_alignment === 'center' ? 'text-grey-900' : 'text-grey-500',
                                onClick: () => updateNewsletter({title_alignment: 'center'}),
                                disabled: !newsletter.show_post_title_section
                            }
                        ]}
                        className="mb-1 !gap-0"
                        />
                    </div>
                    <Select
                        options={fontOptions}
                        selectedOption={newsletter.body_font_category}
                        title='Body style'
                        onSelect={value => updateNewsletter({body_font_category: value})}
                    />
                    <Toggle
                        checked={newsletter.show_feature_image}
                        direction="rtl"
                        label='Feature image'
                        labelStyle='value'
                        onChange={e => updateNewsletter({show_feature_image: e.target.checked})}
                    />
                </Form>

                <Form className='mt-6' gap='sm' margins='lg' title='Footer'>
                    <ToggleGroup>
                        <Toggle
                            checked={newsletter.feedback_enabled}
                            direction="rtl"
                            label='Ask your readers for feedback'
                            labelStyle='value'
                            onChange={e => updateNewsletter({feedback_enabled: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_comment_cta}
                            direction="rtl"
                            label='Add a link to your comments'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_comment_cta: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_latest_posts}
                            direction="rtl"
                            label='Share your latest posts'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_latest_posts: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_subscription_details}
                            direction="rtl"
                            label='Show subscription details'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_subscription_details: e.target.checked})}
                        />
                    </ToggleGroup>
                    <HtmlField
                        config={config}
                        hint='Any extra information or legal text'
                        nodes='MINIMAL_NODES'
                        title='Email footer'
                        value={newsletter.footer_content || ''}
                        onChange={html => updateNewsletter({footer_content: html})}
                    />
                </Form>
            </>
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
                        <Icon className='mr-2 mt-[-1px]' colorClass='text-red' name='heart'/>
                    </span>
                    <Form marginBottom={false}>
                        <Toggle
                            checked={newsletter.show_badge}
                            direction='rtl'
                            hint='Show you’re a part of the indie publishing movement with a small badge in the footer'
                            label='Promote independent publishing'
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_badge: e.target.checked})}
                        />
                    </Form>
                </div>
            </StickyFooter>
        </div>
    );
};

const NewsletterDetailModal: React.FC<NewsletterDetailModalProps> = ({newsletter}) => {
    const modal = useModal();
    const {siteData} = useGlobalData();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const {updateRoute} = useRouting();

    const {formState, updateForm, handleSave, validate, errors, clearError} = useForm({
        initialState: newsletter,
        onSave: async () => {
            const {newsletters, meta} = await editNewsletter(formState);

            if (meta?.sent_email_verification) {
                NiceModal.show(ConfirmationModal, {
                    title: 'Confirm newsletter email address',
                    prompt: <>
                        We&lsquo;ve sent a confirmation email to <strong>{formState.sender_email}</strong>.
                        Until the address has been verified newsletters will be sent from the
                        {newsletters[0].sender_email ? ' previous' : ' default'} email address
                        ({fullEmailAddress(newsletters[0].sender_email || 'noreply', siteData)}).
                    </>,
                    cancelLabel: '',
                    onOk: (confirmModal) => {
                        confirmModal?.remove();
                        modal.remove();
                    }
                });
            } else {
                modal.remove();
            }
        },
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'Please enter a name';
            }

            if (formState.sender_email && !validator.isEmail(formState.sender_email)) {
                newErrors.sender_email = 'Invalid email.';
            }

            return newErrors;
        }
    });

    const updateNewsletter = (fields: Partial<Newsletter>) => {
        updateForm(state => ({...state, ...fields}));
    };

    const preview = <NewsletterPreview newsletter={formState} />;
    const sidebar = <Sidebar clearError={clearError} errors={errors} newsletter={formState} updateNewsletter={updateNewsletter} validate={validate} />;

    return <PreviewModalContent
        afterClose={() => updateRoute('newsletters')}
        deviceSelector={false}
        okLabel='Save & close'
        preview={preview}
        previewBgColor={'grey'}
        previewToolbar={false}
        sidebar={sidebar}
        sidebarPadding={false}
        testId='newsletter-modal'
        title='Newsletter'
        onOk={async () => {
            toast.remove();
            if (await handleSave()) {
                modal.remove();
                updateRoute('newsletters');
            } else {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save newsletter! One or more fields have errors, please doublecheck you filled all mandatory fields'
                });
            }
        }}
    />;
};

export default NiceModal.create(NewsletterDetailModal);
