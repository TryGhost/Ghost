import Button from '../../../../admin-x-ds/global/Button';
import ButtonGroup from '../../../../admin-x-ds/global/ButtonGroup';
import ColorPickerField from '../../../../admin-x-ds/global/form/ColorPickerField';
import ConfirmationModal from '../../../../admin-x-ds/global/modal/ConfirmationModal';
import Form from '../../../../admin-x-ds/global/form/Form';
import Heading from '../../../../admin-x-ds/global/Heading';
import Hint from '../../../../admin-x-ds/global/Hint';
import HtmlField from '../../../../admin-x-ds/global/form/HtmlField';
import Icon from '../../../../admin-x-ds/global/Icon';
import ImageUpload from '../../../../admin-x-ds/global/form/ImageUpload';
import LimitModal from '../../../../admin-x-ds/global/modal/LimitModal';
import NewsletterPreview from './NewsletterPreview';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import Select, {SelectOption} from '../../../../admin-x-ds/global/form/Select';
import Separator from '../../../../admin-x-ds/global/Separator';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import Toggle from '../../../../admin-x-ds/global/form/Toggle';
import ToggleGroup from '../../../../admin-x-ds/global/form/ToggleGroup';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useForm, {ErrorMessages} from '../../../../hooks/useForm';
import useHandleError from '../../../../utils/api/handleError';
import useRouting from '../../../../hooks/useRouting';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import validator from 'validator';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {Newsletter, useBrowseNewsletters, useEditNewsletter} from '../../../../api/newsletters';
import {PreviewModalContent} from '../../../../admin-x-ds/global/modal/PreviewModal';
import {RoutingModalProps} from '../../../providers/RoutingProvider';
import {fullEmailAddress} from '../../../../api/site';
import {getImageUrl, useUploadImage} from '../../../../api/images';
import {getSettingValues} from '../../../../api/settings';
import {showToast} from '../../../../admin-x-ds/global/Toast';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const Sidebar: React.FC<{
    newsletter: Newsletter;
    onlyOne: boolean;
    updateNewsletter: (fields: Partial<Newsletter>) => void;
    validate: () => void;
    errors: ErrorMessages;
    clearError: (field: string) => void;
}> = ({newsletter, onlyOne, updateNewsletter, validate, errors, clearError}) => {
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const limiter = useLimiter();
    const {settings, siteData} = useGlobalData();
    const [membersSupportAddress, icon] = getSettingValues<string>(settings, ['members_support_address', 'icon']);
    const {mutateAsync: uploadImage} = useUploadImage();
    const [selectedTab, setSelectedTab] = useState('generalSettings');
    const hasEmailCustomization = useFeatureFlag('emailCustomization');
    const {localSettings} = useSettingGroup();
    const [siteTitle] = getSettingValues(localSettings, ['title']) as string[];
    const handleError = useHandleError();

    const replyToEmails = [
        {label: `Newsletter address (${fullEmailAddress(newsletter.sender_email || 'noreply', siteData)})`, value: 'newsletter'},
        {label: `Support address (${fullEmailAddress(membersSupportAddress || 'noreply', siteData)})`, value: 'support'}
    ];

    const fontOptions: SelectOption[] = [
        {value: 'serif', label: 'Elegant serif', className: 'font-serif'},
        {value: 'sans_serif', label: 'Clean sans-serif'}
    ];

    const backgroundColorIsDark = () => {
        if (newsletter.background_color === 'dark') {
            return true;
        }
        if (newsletter.background_color === 'light') {
            return false;
        }
        return textColorForBackgroundColor(newsletter.background_color).hex().toLowerCase() === '#ffffff';
    };

    const confirmStatusChange = async () => {
        if (newsletter.status === 'active') {
            NiceModal.show(ConfirmationModal, {
                title: 'Archive newsletter',
                prompt: <>
                    <p>Your newsletter <strong>{newsletter.name}</strong> will no longer be visible to members or available as an option when publishing new posts.</p>
                    <p>Existing posts previously sent as this newsletter will remain unchanged.</p>
                </>,
                okLabel: 'Archive',
                okColor: 'red',
                onOk: async (modal) => {
                    try {
                        await editNewsletter({...newsletter, status: 'archived'});
                        modal?.remove();
                        showToast({
                            type: 'success',
                            message: 'Newsletter archived successfully'
                        });
                    } catch (e) {
                        handleError(e);
                    }
                }
            });
        } else {
            try {
                await limiter?.errorIfWouldGoOverLimit('newsletters');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        prompt: error.message || `Your current plan doesn't support more newsletters.`
                    });
                    return;
                } else {
                    throw error;
                }
            }

            NiceModal.show(ConfirmationModal, {
                title: 'Reactivate newsletter',
                prompt: <>
                        Reactivating <strong>{newsletter.name}</strong> will immediately make it visible to members and re-enable it as an option when publishing new posts.
                </>,
                okLabel: 'Reactivate',
                onOk: async (modal) => {
                    await editNewsletter({...newsletter, status: 'active'});
                    modal?.remove();
                    showToast({
                        type: 'success',
                        message: 'Newsletter reactivated successfully'
                    });
                }
            });
        }
    };

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
                    <TextField placeholder={siteTitle} title="Sender name" value={newsletter.sender_name || ''} onChange={e => updateNewsletter({sender_name: e.target.value})} />
                    <TextField
                        error={Boolean(errors.sender_email)}
                        hint={errors.sender_email}
                        placeholder={fullEmailAddress(newsletter.sender_email || 'noreply', siteData)}
                        title="Sender email address"
                        value={newsletter.sender_email || ''}
                        onBlur={validate}
                        onChange={e => updateNewsletter({sender_email: e.target.value})}
                        onKeyDown={() => clearError('sender_email')}
                    />
                    <Select
                        options={replyToEmails}
                        selectedOption={replyToEmails.find(option => option.value === newsletter.sender_reply_to)}
                        title="Reply-to email"
                        onSelect={option => updateNewsletter({sender_reply_to: option?.value})}
                    />
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
                <Separator />
                <div className='my-5 flex w-full items-start'>
                    <span>
                        <Icon className='mr-2 mt-[-1px]' colorClass='text-red' name='heart'/>
                    </span>
                    <Form marginBottom={false}>
                        <Toggle
                            checked={newsletter.show_badge}
                            direction='rtl'
                            label={
                                <div className='flex flex-col gap-0.5'>
                                    <span className='text-sm md:text-base'>Promote independent publishing</span>
                                    <span className='text-[11px] leading-tight text-grey-700 md:text-xs md:leading-tight'>Show you’re a part of the indie publishing movement with a small badge in the footer</span>
                                </div>
                            }
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_badge: e.target.checked})}
                        />
                    </Form>
                </div>
                <Separator />
                <div className='mb-5 mt-10'>
                    {newsletter.status === 'active' ? (!onlyOne && <Button color='red' label='Archive newsletter' link onClick={confirmStatusChange} />) : <Button color='green' label='Reactivate newsletter' link onClick={confirmStatusChange} />}
                </div>
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
                                    try {
                                        const imageUrl = getImageUrl(await uploadImage({file}));
                                        updateNewsletter({header_image: imageUrl});
                                    } catch (e) {
                                        handleError(e);
                                    }
                                }}
                            >
                                <Icon colorClass='text-grey-700 dark:text-grey-300' name='picture' />
                            </ImageUpload>
                            <Hint>1200x600, optional</Hint>
                        </div>
                    </div>
                    <ToggleGroup>
                        {icon && <Toggle
                            checked={newsletter.show_header_icon}
                            direction="rtl"
                            label='Publication icon'
                            onChange={e => updateNewsletter({show_header_icon: e.target.checked})}
                        />}
                        <Toggle
                            checked={newsletter.show_header_title}
                            direction="rtl"
                            label='Publication title'
                            onChange={e => updateNewsletter({show_header_title: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_header_name}
                            direction="rtl"
                            label='Newsletter name'
                            onChange={e => updateNewsletter({show_header_name: e.target.checked})}
                        />
                    </ToggleGroup>
                </Form>

                <Form className='mt-6' gap='sm' margins='lg' title='Body'>
                    {hasEmailCustomization && <>
                        <ColorPickerField
                            direction='rtl'
                            swatches={[
                                {
                                    hex: '#f0f0f0',
                                    title: 'Light grey'
                                },
                                {
                                    hex: '#ffffff',
                                    value: 'light',
                                    title: 'White'
                                }
                            ]}
                            title='Background color'
                            value={newsletter.background_color || 'light'}
                            onChange={color => updateNewsletter({background_color: color!})}
                        />
                        <ColorPickerField
                            clearButtonValue={null}
                            direction='rtl'
                            swatches={[
                                {
                                    hex: siteData.accent_color,
                                    value: 'accent',
                                    title: 'Accent'
                                },
                                {
                                    hex: backgroundColorIsDark() ? '#ffffff' : '#000000',
                                    value: 'auto',
                                    title: 'Auto'
                                },
                                {
                                    value: null,
                                    title: 'Transparent',
                                    hex: '#00000000'
                                }
                            ]}
                            title='Border color'
                            value={newsletter.border_color}
                            onChange={color => updateNewsletter({border_color: color})}
                        />
                    </>}
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
                                selectedOption={fontOptions.find(option => option.value === newsletter.title_font_category)}
                                onSelect={option => updateNewsletter({title_font_category: option?.value})}
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
                    {hasEmailCustomization && <ColorPickerField
                        direction='rtl'
                        swatches={[
                            {
                                value: 'accent',
                                title: 'Accent',
                                hex: siteData.accent_color
                            },
                            {
                                value: null,
                                title: 'Auto',
                                hex: backgroundColorIsDark() ? '#ffffff' : '#000000'
                            }
                        ]}
                        title='Heading color'
                        value={newsletter.title_color}
                        onChange={color => updateNewsletter({title_color: color})}
                    />}
                    <Select
                        options={fontOptions}
                        selectedOption={fontOptions.find(option => option.value === newsletter.body_font_category)}
                        testId='body-font-select'
                        title='Body style'
                        onSelect={option => updateNewsletter({body_font_category: option?.value})}
                    />
                    <Toggle
                        checked={newsletter.show_feature_image}
                        direction="rtl"
                        label='Feature image'
                        onChange={e => updateNewsletter({show_feature_image: e.target.checked})}
                    />
                </Form>

                <Form className='mt-6' gap='sm' margins='lg' title='Footer'>
                    <ToggleGroup gap='lg'>
                        <Toggle
                            checked={newsletter.feedback_enabled}
                            direction="rtl"
                            label='Ask your readers for feedback'
                            onChange={e => updateNewsletter({feedback_enabled: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_comment_cta}
                            direction="rtl"
                            label='Add a link to your comments'
                            onChange={e => updateNewsletter({show_comment_cta: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_latest_posts}
                            direction="rtl"
                            label='Share your latest posts'
                            onChange={e => updateNewsletter({show_latest_posts: e.target.checked})}
                        />
                        <Toggle
                            checked={newsletter.show_subscription_details}
                            direction="rtl"
                            label='Show subscription details'
                            onChange={e => updateNewsletter({show_subscription_details: e.target.checked})}
                        />
                    </ToggleGroup>
                    <HtmlField
                        hint='Any extra information or legal text'
                        nodes='MINIMAL_NODES'
                        placeholder=' '
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
        <div className='flex flex-col'>
            <div className='px-7 pb-7 pt-5'>
                <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={handleTabChange} />
            </div>
        </div>
    );
};

const NewsletterDetailModalContent: React.FC<{newsletter: Newsletter; onlyOne: boolean;}> = ({newsletter, onlyOne}) => {
    const modal = useModal();
    const {siteData} = useGlobalData();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();

    const {formState, saveState, updateForm, setFormState, handleSave, validate, errors, clearError} = useForm({
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
                        updateRoute('newsletters');
                    }
                });
            }
        },
        onSaveError: handleError,
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

    useEffect(() => {
        setFormState(() => newsletter);
    }, [setFormState, newsletter]);

    const preview = <NewsletterPreview newsletter={formState} />;
    const sidebar = <Sidebar clearError={clearError} errors={errors} newsletter={formState} onlyOne={onlyOne} updateNewsletter={updateNewsletter} validate={validate} />;

    return <PreviewModalContent
        afterClose={() => updateRoute('newsletters')}
        buttonsDisabled={saveState === 'saving'}
        cancelLabel='Close'
        deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okColor={saveState === 'saved' ? 'green' : 'black'}
        okLabel={saveState === 'saved' ? 'Saved' : (saveState === 'saving' ? 'Saving...' : 'Save')}
        preview={preview}
        previewBgColor={'grey'}
        previewToolbar={false}
        sidebar={sidebar}
        sidebarPadding={false}
        testId='newsletter-modal'
        title='Newsletter'
        onOk={async () => {
            if (!(await handleSave())) {
                showToast({
                    type: 'pageError',
                    message: 'Can\'t save newsletter, please double check that you\'ve filled all mandatory fields.'
                });
            }
        }}
    />;
};

const NewsletterDetailModal: React.FC<RoutingModalProps> = ({params}) => {
    const {data: {newsletters, isEnd} = {}, fetchNextPage} = useBrowseNewsletters();
    const newsletter = newsletters?.find(({id}) => id === params?.id);

    useEffect(() => {
        if (!newsletter && !isEnd) {
            fetchNextPage();
        }
    }, [fetchNextPage, isEnd, newsletter]);

    if (newsletter) {
        return <NewsletterDetailModalContent newsletter={newsletter} onlyOne={newsletters!.length === 1} />;
    } else {
        return null;
    }
};

export default NiceModal.create(NewsletterDetailModal);
