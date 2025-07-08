import NewsletterPreview from './NewsletterPreview';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import useSettingGroup from '../../../../hooks/useSettingGroup';
import validator from 'validator';
import {Button, ButtonGroup, ColorPickerField, ConfirmationModal, Form, Heading, Hint, HtmlField, Icon, ImageUpload, LimitModal, PreviewModalContent, Select, SelectOption, Separator, Tab, TabView, TextArea, TextField, Toggle, ToggleGroup, showToast} from '@tryghost/admin-x-design-system';
import {ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {HostLimitError, useLimiter} from '../../../../hooks/useLimiter';
import {Newsletter, useBrowseNewsletters, useEditNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {hasSendingDomain, isManagedEmail, sendingDomain} from '@tryghost/admin-x-framework/api/config';
import {renderReplyToEmail, renderSenderEmail} from '../../../../utils/newsletterEmails';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {useGlobalData} from '../../../providers/GlobalDataProvider';

const ReplyToEmailField: React.FC<{
    newsletter: Newsletter;
    updateNewsletter: (fields: Partial<Newsletter>) => void;
    errors: ErrorMessages;
    validate: () => void;
    clearError: (field: string) => void;
}> = ({newsletter, updateNewsletter, errors, clearError}) => {
    const {settings, config} = useGlobalData();
    const [defaultEmailAddress, supportEmailAddress] = getSettingValues<string>(settings, ['default_email_address', 'support_email_address']);

    // When editing the senderReplyTo, we use a state, so we don't cause jumps when the 'rendering' method decides to change the value
    // Because 'newsletter' 'support' or an empty value can be mapped to a default value, we don't want those changes to happen when entering text
    const [senderReplyTo, setSenderReplyTo] = useState(renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress) || '');

    let newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSenderReplyTo(e.target.value);
        updateNewsletter({sender_reply_to: e.target.value || 'newsletter'});
    }, [updateNewsletter, setSenderReplyTo]);

    const onBlur = () => {
        // Update the senderReplyTo to the rendered value again
        const rendered = renderReplyToEmail(newsletter, config, supportEmailAddress, defaultEmailAddress) || '';
        setSenderReplyTo(rendered);
    };

    // Pro users without custom sending domains
    return (
        <TextField
            error={Boolean(errors.sender_reply_to)}
            hint={errors.sender_reply_to}
            maxLength={191}
            placeholder={newsletterAddress || ''}
            title="Reply-to email"
            value={senderReplyTo}
            onBlur={onBlur}
            onChange={onChange}
            onKeyDown={() => clearError('sender_reply_to')}
        />
    );
};

const Sidebar: React.FC<{
    newsletter: Newsletter;
    onlyOne: boolean;
    updateNewsletter: (fields: Partial<Newsletter>) => void;
    validate: () => void;
    errors: ErrorMessages;
    clearError: (field: string) => void;
}> = ({newsletter, onlyOne, updateNewsletter, validate, errors, clearError}) => {
    const {updateRoute} = useRouting();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const limiter = useLimiter();
    const {settings, config, siteData} = useGlobalData();
    const [icon, defaultEmailAddress] = getSettingValues<string>(settings, ['icon', 'default_email_address']);
    const {mutateAsync: uploadImage} = useUploadImage();
    const [selectedTab, setSelectedTab] = useState('generalSettings');
    const {localSettings} = useSettingGroup();
    const [siteTitle] = getSettingValues(localSettings, ['title']) as string[];
    const handleError = useHandleError();
    const {data: {newsletters: apiNewsletters} = {}} = useBrowseNewsletters();
    const commentsEnabled = ['all', 'paid'].includes(getSettingValue(settings, 'comments_enabled') || '');

    let newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);
    const [newsletters, setNewsletters] = useState<Newsletter[]>(apiNewsletters || []);
    const activeNewsletters = newsletters.filter(n => n.status === 'active');

    useEffect(() => {
        setNewsletters(apiNewsletters || []);
    }, [apiNewsletters]);

    const fontOptions: SelectOption[] = [
        {value: 'serif', label: 'Elegant serif', className: 'font-serif'},
        {value: 'sans_serif', label: 'Clean sans-serif'}
    ];

    const fontWeightOptions: Record<string, {options: SelectOption[], map?: Record<string, string>}> = {
        sans_serif: {
            options: [
                {value: 'normal', label: 'Regular', className: 'font-normal'},
                {value: 'medium', label: 'Medium', className: 'font-medium'},
                {value: 'semibold', label: 'Semi-bold', className: 'font-semibold'},
                {value: 'bold', label: 'Bold', className: 'font-bold'}
            ]
        },
        serif: {
            options: [
                {value: 'normal', label: 'Regular', className: 'font-normal'},
                {value: 'bold', label: 'Bold', className: 'font-bold'}
            ],
            map: {
                medium: 'normal',
                semibold: 'bold'
            }
        }
    };

    const backgroundColorIsDark = () => {
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
                    <div className="mb-6">Your newsletter <strong>{newsletter.name}</strong> will no longer be visible to members or available as an option when publishing new posts.</div>
                    <div>Existing posts previously sent as this newsletter will remain unchanged.</div>
                </>,
                okLabel: 'Archive',
                okColor: 'red',
                onOk: async (modal) => {
                    try {
                        await editNewsletter({...newsletter, status: 'archived'});
                        modal?.remove();
                        showToast({
                            type: 'success',
                            message: 'Newsletter archived'
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
                        prompt: error.message || `Your current plan doesn't support more newsletters.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
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
                        message: 'Newsletter reactivated'
                    });
                }
            });
        }
    };

    const renderSenderEmailField = () => {
        // Self-hosters
        if (!isManagedEmail(config)) {
            return (
                <TextField
                    error={Boolean(errors.sender_email)}
                    hint={errors.sender_email}
                    placeholder={newsletterAddress || ''}
                    title="Sender email address"
                    value={newsletter.sender_email || ''}
                    onChange={e => updateNewsletter({sender_email: e.target.value})}
                    onKeyDown={() => clearError('sender_email')}
                />
            );
        }

        // Pro users with custom sending domains
        if (hasSendingDomain(config)) {
            return (
                <TextField
                    error={Boolean(errors.sender_email)}
                    hint={errors.sender_email}
                    maxLength={191}
                    placeholder={defaultEmailAddress}
                    title="Sender email address"
                    value={newsletter.sender_email || ''}
                    onChange={(e) => {
                        updateNewsletter({sender_email: e.target.value});
                    }}
                    onKeyDown={() => clearError('sender_email')}
                />
            );
        }

        // Pro users without custom sending domains
        // We're not showing the field since it's not editable
    };

    const headingFontWeightOptions = fontWeightOptions[newsletter.title_font_category || 'sans_serif'].options;

    // not all weights will be available for all fonts, if it doesn't exist find the closest match
    const getSelectedFontWeightOption = () => {
        const category = newsletter.title_font_category || 'sans_serif';
        const fontWeight = newsletter.title_font_weight;
        const weightMap = fontWeightOptions[category].map;
        const mappedWeight = weightMap ? (weightMap[fontWeight] || fontWeight) : fontWeight;
        const option = headingFontWeightOptions.find(o => o.value === mappedWeight);
        return option || headingFontWeightOptions[0];
    };
    // changing font category changes available weights so we may need to map to the closest match
    const changeSelectedTitleFont = (option: SelectOption | null) => {
        const categoryValue = option?.value || 'sans_serif';

        // ensure the weight is valid for the new font by switching to closest match
        const currentWeight = newsletter.title_font_weight;
        let newWeight = currentWeight;
        if (!fontWeightOptions[categoryValue].options.find(o => o.value === currentWeight)) {
            newWeight = fontWeightOptions[categoryValue].map?.[currentWeight] || 'bold';
        }

        return updateNewsletter({
            title_font_category: categoryValue,
            title_font_weight: newWeight
        });
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
                        maxLength={191}
                        placeholder="Weekly Roundup"
                        title="Name"
                        value={newsletter.name || ''}
                        onChange={e => updateNewsletter({name: e.target.value})}
                        onKeyDown={() => clearError('name')}
                    />
                    <TextArea maxLength={2000} rows={2} title="Description" value={newsletter.description || ''} onChange={e => updateNewsletter({description: e.target.value})} />
                </Form>
                <Form className='mt-6' gap='sm' margins='lg' title='Email info'>
                    <TextField maxLength={191} placeholder={siteTitle} title="Sender name" value={newsletter.sender_name || ''} onChange={e => updateNewsletter({sender_name: e.target.value})} />
                    {renderSenderEmailField()}
                    <ReplyToEmailField clearError={clearError} errors={errors} newsletter={newsletter} updateNewsletter={updateNewsletter} validate={validate} />
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
                <div className='mb-5 mt-10'>
                    {newsletter.status === 'active' ? (!onlyOne && <Button color='red' disabled={activeNewsletters.length === 1} label='Archive newsletter' link onClick={confirmStatusChange}/>) : <Button color='green' label='Reactivate newsletter' link onClick={confirmStatusChange} />}
                </div>
            </>
        },
        {
            id: 'content',
            title: 'Content',
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
                            <Hint>1200×600 recommended. Use a transparent PNG for best results on any background.</Hint>
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

                <Form className='mt-6' gap='xs' margins='lg' title='Title section'>
                    <Toggle
                        checked={newsletter.show_post_title_section}
                        direction="rtl"
                        label='Post title'
                        onChange={e => updateNewsletter({show_post_title_section: e.target.checked})}
                    />
                    {newsletter.show_post_title_section &&
                        <Toggle
                            checked={newsletter.show_excerpt}
                            direction="rtl"
                            label="Post excerpt"
                            onChange={e => updateNewsletter({show_excerpt: e.target.checked})}
                        />
                    }
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
                        {commentsEnabled && <Toggle
                            checked={newsletter.show_comment_cta}
                            direction="rtl"
                            label='Add a link to your comments'
                            onChange={e => updateNewsletter({show_comment_cta: e.target.checked})}
                        />}
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
                                    <span className='text-[11px] leading-tight text-grey-700 md:text-xs md:leading-tight'>Show you&apos;re a part of the indie publishing movement with a small badge in the footer</span>
                                </div>
                            }
                            labelStyle='value'
                            onChange={e => updateNewsletter({show_badge: e.target.checked})}
                        />
                    </Form>
                </div>
            </>
        },
        {
            id: 'design',
            title: 'Design',
            contents:
            <>
                <Form className='mt-6' gap='xs' margins='lg' title='Global'>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
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
                    </div>
                    <div className='flex w-full items-center justify-between gap-2'>
                        <div className='shrink-0'>Heading font</div>
                        <Select
                            containerClassName='max-w-[200px]'
                            options={fontOptions}
                            selectedOption={fontOptions.find(option => option.value === newsletter.title_font_category)}
                            onSelect={changeSelectedTitleFont}
                        />
                    </div>
                    <div className='flex w-full items-center justify-between gap-2'>
                        <div className='shrink-0'>Heading weight</div>
                        <Select
                            containerClassName='max-w-[200px]'
                            options={headingFontWeightOptions}
                            selectedOption={getSelectedFontWeightOption()}
                            onSelect={option => updateNewsletter({title_font_weight: option?.value})}
                        />
                    </div>
                    <div className='flex w-full items-center justify-between gap-2'>
                        <div className='shrink-0'>Body font</div>
                        <Select
                            containerClassName='max-w-[200px]'
                            options={fontOptions}
                            selectedOption={fontOptions.find(option => option.value === newsletter.body_font_category)}
                            testId='body-font-select'
                            onSelect={option => updateNewsletter({body_font_category: option?.value})}
                        />
                    </div>
                </Form>
                <Form className='mt-6' gap='xs' margins='lg' title='Header'>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
                                {
                                    value: 'transparent',
                                    title: 'Transparent',
                                    hex: '#00000000'
                                }
                            ]}
                            title='Header background color'
                            value={newsletter.header_background_color || 'transparent'}
                            onChange={color => updateNewsletter({header_background_color: color!})}
                        />
                    </div>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
                                {
                                    value: null,
                                    title: 'Auto',
                                    hex: backgroundColorIsDark() ? '#ffffff' : '#000000'
                                },
                                {
                                    value: 'accent',
                                    title: 'Accent',
                                    hex: siteData.accent_color
                                }
                            ]}
                            title='Post title color'
                            value={newsletter.post_title_color}
                            onChange={color => updateNewsletter({post_title_color: color})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Title alignment</div>
                        <ButtonGroup activeKey={newsletter.title_alignment} buttons={[
                            {
                                key: 'left',
                                icon: 'align-left',
                                iconSize: 14,
                                label: 'Align left',
                                tooltip: 'Left',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({title_alignment: 'left'}),
                                disabled: !newsletter.show_post_title_section
                            },
                            {
                                key: 'center',
                                icon: 'align-center',
                                iconSize: 14,
                                label: 'Align center',
                                tooltip: 'Center',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({title_alignment: 'center'}),
                                disabled: !newsletter.show_post_title_section
                            }
                        ]} clearBg={false} />
                    </div>
                </Form>

                <Form className='mt-6' gap='xs' margins='lg' title='Body'>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
                                {
                                    value: null,
                                    title: 'Auto',
                                    hex: backgroundColorIsDark() ? '#ffffff' : '#000000'
                                },
                                {
                                    value: 'accent',
                                    title: 'Accent',
                                    hex: siteData.accent_color
                                }
                            ]}
                            title='Section title color'
                            value={newsletter.section_title_color}
                            onChange={color => updateNewsletter({section_title_color: color})}
                        />
                    </div>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
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
                            title='Button color'
                            value={newsletter.button_color}
                            onChange={color => updateNewsletter({button_color: color})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Button style</div>
                        <ButtonGroup activeKey={newsletter.button_style || 'fill'} buttons={[
                            {
                                key: 'fill',
                                icon: 'squircle-fill',
                                iconSize: 14,
                                label: 'Fill',
                                tooltip: 'Fill',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({button_style: 'fill'})
                            },
                            {
                                key: 'outline',
                                icon: 'squircle',
                                iconSize: 14,
                                label: 'Outline',
                                tooltip: 'Outline',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({button_style: 'outline'})
                            }
                        ]} clearBg={false} />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Button corners</div>
                        <ButtonGroup activeKey={newsletter.button_corners || 'rounded'} buttons={[
                            {
                                key: 'square',
                                icon: 'square',
                                iconSize: 14,
                                label: 'Square',
                                tooltip: 'Squared',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({button_corners: 'square'})
                            },
                            {
                                key: 'rounded',
                                icon: 'squircle',
                                iconSize: 14,
                                label: 'Rounded',
                                tooltip: 'Rounded',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({button_corners: 'rounded'})
                            },
                            {
                                key: 'pill',
                                icon: 'circle',
                                iconSize: 14,
                                label: 'Pill',
                                tooltip: 'Pill',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({button_corners: 'pill'})
                            }
                        ]} clearBg={false} />
                    </div>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
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
                            title='Link color'
                            value={newsletter.link_color}
                            onChange={color => updateNewsletter({link_color: color})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Link style</div>
                        <ButtonGroup activeKey={newsletter.link_style || 'underline'} buttons={[
                            {
                                key: 'underline',
                                icon: 'text-underline',
                                iconSize: 14,
                                label: 'Underline',
                                tooltip: 'Underline',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({link_style: 'underline'})
                            },
                            {
                                key: 'regular',
                                icon: 'text-regular',
                                iconSize: 14,
                                label: 'Regular',
                                tooltip: 'Regular',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({link_style: 'regular'})
                            },
                            {
                                key: 'bold',
                                icon: 'text-bold',
                                iconSize: 14,
                                label: 'Bold',
                                tooltip: 'Bold',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({link_style: 'bold'})
                            }
                        ]} clearBg={false} />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Image corners</div>
                        <ButtonGroup activeKey={newsletter.image_corners || 'square'} buttons={[
                            {
                                key: 'square',
                                icon: 'square',
                                iconSize: 14,
                                label: 'Square',
                                tooltip: 'Squared',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({image_corners: 'square'})
                            },
                            {
                                key: 'rounded',
                                icon: 'squircle',
                                iconSize: 14,
                                label: 'Rounded',
                                tooltip: 'Rounded',
                                hideLabel: true,
                                link: false,
                                size: 'sm',
                                onClick: () => updateNewsletter({image_corners: 'rounded'})
                            }
                        ]} clearBg={false} />
                    </div>
                    <div className='mb-1'>
                        <ColorPickerField
                            direction='rtl'
                            eyedropper={true}
                            swatches={[
                                {
                                    value: 'light',
                                    title: 'Light',
                                    hex: '#e0e7eb'
                                },
                                {
                                    value: 'accent',
                                    title: 'Accent',
                                    hex: siteData.accent_color
                                }
                            ]}
                            title='Divider color'
                            value={newsletter.divider_color || 'light'}
                            onChange={color => updateNewsletter({divider_color: color})}
                        />
                    </div>
                </Form>
            </>
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='flex flex-col'>
            <div className='px-7 pb-7 pt-0'>
                <TabView selectedTab={selectedTab} stickyHeader={true} tabs={tabs} onTabChange={handleTabChange} />
            </div>
        </div>
    );
};

const NewsletterDetailModalContent: React.FC<{newsletter: Newsletter; onlyOne: boolean;}> = ({newsletter, onlyOne}) => {
    const {config} = useGlobalData();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const {updateRoute} = useRouting();
    const handleError = useHandleError();

    const {formState, saveState, updateForm, setFormState, handleSave, validate, errors, clearError, okProps} = useForm({
        initialState: newsletter,
        savingDelay: 500,
        onSave: async () => {
            const {meta: {sent_email_verification: [emailToVerify] = []} = {}} = await editNewsletter(formState); ``;
            let toastMessage;

            if (emailToVerify && emailToVerify === 'sender_email') {
                toastMessage = <div>We&lsquo;ve sent a confirmation email to the new address.</div>;
            } else if (emailToVerify && emailToVerify === 'sender_reply_to') {
                toastMessage = <div>We&lsquo;ve sent a confirmation email to the new address.</div>;
            }

            if (toastMessage) {
                showToast({
                    icon: 'email',
                    message: toastMessage,
                    type: 'info'
                });
            }
        },
        onSaveError: handleError,
        onValidate: () => {
            const newErrors: Record<string, string> = {};

            if (!formState.name) {
                newErrors.name = 'A name is required for your newsletter';
            }

            if (formState.sender_email && !validator.isEmail(formState.sender_email)) {
                newErrors.sender_email = 'Enter a valid email address';
            } else if (formState.sender_email && hasSendingDomain(config) && formState.sender_email.split('@')[1] !== sendingDomain(config)) {
                newErrors.sender_email = `Email address must end with @${sendingDomain(config)}`;
            }

            if (formState.sender_reply_to && !validator.isEmail(formState.sender_reply_to) && !['newsletter', 'support'].includes(formState.sender_reply_to)) {
                newErrors.sender_reply_to = 'Enter a valid email address';
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
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        deviceSelector={false}
        dirty={saveState === 'unsaved'}
        okColor={okProps.color}
        okLabel={okProps.label || 'Save'}
        preview={preview}
        previewBgColor={'grey'}
        previewToolbar={false}
        sidebar={sidebar}
        sidebarPadding={false}
        testId='newsletter-modal'
        title='Newsletter'
        onOk={async () => {
            await handleSave({fakeWhenUnchanged: true});
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
