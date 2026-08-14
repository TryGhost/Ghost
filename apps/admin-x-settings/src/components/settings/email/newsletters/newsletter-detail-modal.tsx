import ColorPickerField from '../../../color-picker-field';
import ConfirmationModal from '../../../confirmation-modal';
import HtmlField from '../../../html-field';
import LimitModal from '../../../limit-modal';
import NewsletterPreview from './newsletter-preview';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import useFeatureFlag from '../../../../hooks/use-feature-flag';
import useSettingGroup from '../../../../hooks/use-setting-group';
import validator from 'validator';
import {Button, Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, ToggleGroup, ToggleGroupItem, Tooltip, TooltipContent, TooltipTrigger} from '@tryghost/shade/components';
import {type ErrorMessages, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {HostLimitError, useLimiter} from '../../../../hooks/use-limiter';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {LucideIcon, formatNumber} from '@tryghost/shade/utils';
import {type Newsletter, useBrowseNewsletters, useEditNewsletter} from '@tryghost/admin-x-framework/api/newsletters';
import {PreviewModalContent} from '../../preview-modal';
import {type RoutingModalProps, useRouting} from '@tryghost/admin-x-framework/routing';
import {Stack, Text} from '@tryghost/shade/primitives';
import {Trash2} from 'lucide-react';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {getSettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {hasSendingDomain, isManagedEmail, sendingDomain} from '@tryghost/admin-x-framework/api/config';
import {renderReplyToEmail, renderSenderEmail} from '../../../../utils/newsletter-emails';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import {toast} from 'sonner';
import {useGlobalData} from '../../../providers/global-data-provider';

interface IconToggleOption {
    value: string;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}

const IconToggleGroup: React.FC<{
    label: string;
    value: string;
    options: IconToggleOption[];
    onValueChange: (value: string) => void;
}> = ({label, value, options, onValueChange}) => (
    <ToggleGroup aria-label={label} type='single' value={value} onValueChange={nextValue => nextValue && onValueChange(nextValue)}>
        {options.map(option => (
            <Tooltip key={option.value}>
                <TooltipTrigger asChild>
                    <ToggleGroupItem aria-label={option.label} disabled={option.disabled} value={option.value}>
                        {option.icon}
                    </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{option.label}</TooltipContent>
            </Tooltip>
        ))}
    </ToggleGroup>
);

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

    const newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);

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
        <Field data-invalid={Boolean(errors.sender_reply_to) || undefined}>
            <FieldLabel htmlFor='newsletter-reply-to'>Reply-to email</FieldLabel>
            <Input aria-invalid={Boolean(errors.sender_reply_to) || undefined} id='newsletter-reply-to' maxLength={191} placeholder={newsletterAddress || ''} value={senderReplyTo} onBlur={onBlur} onChange={onChange} onKeyDown={() => clearError('sender_reply_to')} />
            {errors.sender_reply_to && <FieldError>{errors.sender_reply_to}</FieldError>}
        </Field>
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
    type FontOption = {value: string; label: string; className?: string};
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

    const newsletterAddress = renderSenderEmail(newsletter, config, defaultEmailAddress);
    const [newsletters, setNewsletters] = useState<Newsletter[]>(apiNewsletters || []);
    const activeNewsletters = newsletters.filter(n => n.status === 'active');

    useEffect(() => {
        setNewsletters(apiNewsletters || []);
    }, [apiNewsletters]);

    const fontOptions: FontOption[] = [
        {value: 'serif', label: 'Elegant serif', className: 'font-serif'},
        {value: 'sans_serif', label: 'Clean sans-serif'}
    ];

    const fontWeightOptions: Record<string, {options: FontOption[], map?: Record<string, string>}> = {
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
                okVariant: 'destructive',
                onOk: async (modal) => {
                    try {
                        await editNewsletter({...newsletter, status: 'archived'});
                        modal?.remove();
                        toast.success('Newsletter archived');
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
                    toast.success('Newsletter reactivated');
                }
            });
        }
    };

    const renderSenderEmailField = () => {
        // Self-hosters
        if (!isManagedEmail(config)) {
            return (
                <Field data-invalid={Boolean(errors.sender_email) || undefined}>
                    <FieldLabel htmlFor='newsletter-sender-email'>Sender email address</FieldLabel>
                    <Input aria-invalid={Boolean(errors.sender_email) || undefined} id='newsletter-sender-email' placeholder={newsletterAddress || ''} value={newsletter.sender_email || ''} onChange={e => updateNewsletter({sender_email: e.target.value})} onKeyDown={() => clearError('sender_email')} />
                    {errors.sender_email && <FieldError>{errors.sender_email}</FieldError>}
                </Field>
            );
        }

        // Pro users with custom sending domains
        if (hasSendingDomain(config)) {
            return (
                <Field data-invalid={Boolean(errors.sender_email) || undefined}>
                    <FieldLabel htmlFor='newsletter-sender-email'>Sender email address</FieldLabel>
                    <Input aria-invalid={Boolean(errors.sender_email) || undefined} id='newsletter-sender-email' maxLength={191} placeholder={defaultEmailAddress} value={newsletter.sender_email || ''} onChange={(e) => {
                        updateNewsletter({sender_email: e.target.value});
                    }} onKeyDown={() => clearError('sender_email')} />
                    {errors.sender_email && <FieldError>{errors.sender_email}</FieldError>}
                </Field>
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
    const changeSelectedTitleFont = (categoryValue: string) => {

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

    const tabs = [
        {
            id: 'generalSettings',
            title: 'General',
            contents:
            <>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Name and description</FieldLegend>
                    <FieldGroup className='mb-12 gap-6 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                    <Field data-invalid={Boolean(errors.name) || undefined}>
                        <FieldLabel htmlFor='newsletter-detail-name'>Name</FieldLabel>
                        <Input aria-invalid={Boolean(errors.name) || undefined} id='newsletter-detail-name' maxLength={191} placeholder='Weekly Roundup' value={newsletter.name || ''} onChange={e => updateNewsletter({name: e.target.value})} onKeyDown={() => clearError('name')} />
                        {errors.name && <FieldError>{errors.name}</FieldError>}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='newsletter-description'>Description</FieldLabel>
                        <Textarea className='border-transparent bg-muted' id='newsletter-description' maxLength={2000} rows={2} value={newsletter.description || ''} onChange={e => updateNewsletter({description: e.target.value})} />
                    </Field>
                    </FieldGroup>
                </FieldSet>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Email info</FieldLegend>
                    <FieldGroup className='mb-12 gap-6 [&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
                    <Field>
                        <FieldLabel htmlFor='newsletter-sender-name'>Sender name</FieldLabel>
                        <Input id='newsletter-sender-name' maxLength={191} placeholder={siteTitle} value={newsletter.sender_name || ''} onChange={e => updateNewsletter({sender_name: e.target.value})} />
                    </Field>
                    {renderSenderEmailField()}
                    <ReplyToEmailField clearError={clearError} errors={errors} newsletter={newsletter} updateNewsletter={updateNewsletter} validate={validate} />
                    </FieldGroup>
                </FieldSet>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Member settings</FieldLegend>
                    <FieldGroup className='mb-12 gap-6'>
                    <Field orientation='horizontal'>
                        <FieldLabel htmlFor='newsletter-subscribe-on-signup'>Subscribe new members on signup</FieldLabel>
                        <Switch checked={Boolean(newsletter.subscribe_on_signup)} id='newsletter-subscribe-on-signup' onCheckedChange={checked => updateNewsletter({subscribe_on_signup: checked})} />
                    </Field>
                    </FieldGroup>
                </FieldSet>
                <div className='mt-10 mb-5'>
                    {newsletter.status === 'active' ? (!onlyOne && <Button className='text-destructive hover:text-destructive' disabled={activeNewsletters.length === 1} type='button' variant='ghost' onClick={confirmStatusChange}>Archive newsletter</Button>) : <Button className='text-green hover:text-green' type='button' variant='ghost' onClick={confirmStatusChange}>Reactivate newsletter</Button>}
                </div>
            </>
        },
        {
            id: 'content',
            title: 'Content',
            contents:
            <>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Header</FieldLegend>
                    <FieldGroup className='mb-12 gap-6'>
                    <div>
                        <div>
                            <Text as='h6' className="mb-2 text-base" weight='semibold'>Header image</Text>
                        </div>
                        <div className='flex-column flex gap-1'>
                            <ImageUpload className='h-16.5'>
                                {newsletter.header_image ? (
                                    <ImageUploadPreview>
                                        <ImageUploadImage id='logo' src={newsletter.header_image} />
                                        <ImageUploadActions>
                                            <ImageUploadAction aria-label='Remove header image' onClick={() => updateNewsletter({header_image: null})}>
                                                <Trash2 />
                                            </ImageUploadAction>
                                        </ImageUploadActions>
                                    </ImageUploadPreview>
                                ) : (
                                    <ImageUploadDropzone inputId='logo' onDropAccepted={async ([file]) => {
                                        try {
                                            const imageUrl = getImageUrl(await uploadImage({file}));
                                            updateNewsletter({header_image: imageUrl});
                                        } catch (e) {
                                            handleError(e);
                                        }
                                    }}>
                                        <LucideIcon.Image className='size-5 text-grey-700 dark:text-grey-300' />
                                    </ImageUploadDropzone>
                                )}
                            </ImageUpload>
                            <FieldDescription>{formatNumber(1200)}×{formatNumber(600)} recommended. Use a transparent PNG for best results on any background.</FieldDescription>
                        </div>
                    </div>
                    <Stack gap='md'>
                        {icon && <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-header-icon'>Publication icon</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_header_icon)} id='newsletter-show-header-icon' onCheckedChange={checked => updateNewsletter({show_header_icon: checked})} />
                        </Field>}
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-header-title'>Publication title</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_header_title)} id='newsletter-show-header-title' onCheckedChange={checked => updateNewsletter({show_header_title: checked})} />
                        </Field>
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-header-name'>Newsletter name</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_header_name)} id='newsletter-show-header-name' onCheckedChange={checked => updateNewsletter({show_header_name: checked})} />
                        </Field>
                    </Stack>
                    </FieldGroup>
                </FieldSet>

                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Title section</FieldLegend>
                    <FieldGroup className='mb-12 gap-4'>
                    <Field orientation='horizontal'>
                        <FieldLabel htmlFor='newsletter-show-post-title'>Post title</FieldLabel>
                        <Switch checked={Boolean(newsletter.show_post_title_section)} id='newsletter-show-post-title' onCheckedChange={checked => updateNewsletter({show_post_title_section: checked})} />
                    </Field>
                    {newsletter.show_post_title_section &&
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-excerpt'>Post excerpt</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_excerpt)} id='newsletter-show-excerpt' onCheckedChange={checked => updateNewsletter({show_excerpt: checked})} />
                        </Field>
                    }
                    <Field orientation='horizontal'>
                        <FieldLabel htmlFor='newsletter-show-feature-image'>Feature image</FieldLabel>
                        <Switch checked={Boolean(newsletter.show_feature_image)} id='newsletter-show-feature-image' onCheckedChange={checked => updateNewsletter({show_feature_image: checked})} />
                    </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Footer</FieldLegend>
                    <FieldGroup className='mb-12 gap-6'>
                    <Stack gap='lg'>
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-feedback-enabled'>Ask your readers for feedback</FieldLabel>
                            <Switch checked={Boolean(newsletter.feedback_enabled)} id='newsletter-feedback-enabled' onCheckedChange={checked => updateNewsletter({feedback_enabled: checked})} />
                        </Field>
                        {commentsEnabled && <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-comment-cta'>Add a link to your comments</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_comment_cta)} id='newsletter-show-comment-cta' onCheckedChange={checked => updateNewsletter({show_comment_cta: checked})} />
                        </Field>}
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-share-button'>Show share button</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_share_button)} id='newsletter-show-share-button' onCheckedChange={checked => updateNewsletter({show_share_button: checked})} />
                        </Field>
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-latest-posts'>Share your latest posts</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_latest_posts)} id='newsletter-show-latest-posts' onCheckedChange={checked => updateNewsletter({show_latest_posts: checked})} />
                        </Field>
                        <Field orientation='horizontal'>
                            <FieldLabel htmlFor='newsletter-show-subscription-details'>Show subscription details</FieldLabel>
                            <Switch checked={Boolean(newsletter.show_subscription_details)} id='newsletter-show-subscription-details' onCheckedChange={checked => updateNewsletter({show_subscription_details: checked})} />
                        </Field>
                    </Stack>
                    <HtmlField
                        hint='Any extra information or legal text'
                        nodes='MINIMAL_NODES'
                        placeholder=' '
                        title='Email footer'
                        value={newsletter.footer_content || ''}
                        onChange={html => updateNewsletter({footer_content: html})}
                    />
                    </FieldGroup>
                </FieldSet>
                <Separator />
                <div className='my-5 flex w-full items-start'>
                    <span>
                        <LucideIcon.Heart className='mt-[-1px] mr-2 size-5 text-red'/>
                    </span>
                    <FieldGroup className='gap-8'>
                        <Field orientation='horizontal'>
                            <FieldContent>
                                <FieldLabel htmlFor='newsletter-show-badge'>Promote independent publishing</FieldLabel>
                                <FieldDescription>Show you&apos;re a part of the indie publishing movement with a small badge in the footer</FieldDescription>
                            </FieldContent>
                            <Switch checked={Boolean(newsletter.show_badge)} id='newsletter-show-badge' onCheckedChange={checked => updateNewsletter({show_badge: checked})} />
                        </Field>
                    </FieldGroup>
                </div>
            </>
        },
        {
            id: 'design',
            title: 'Design',
            contents:
            <>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Global</FieldLegend>
                    <FieldGroup className='mb-12 gap-4'>
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
                        <Field className='max-w-[200px]'>
                            <FieldLabel className='sr-only'>Heading font</FieldLabel>
                            <Select value={newsletter.title_font_category} onValueChange={changeSelectedTitleFont}>
                                <SelectTrigger aria-label='Heading font'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {fontOptions.map(option => <SelectItem key={option.value} value={option.value}><span className={option.className}>{option.label}</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <div className='flex w-full items-center justify-between gap-2'>
                        <div className='shrink-0'>Heading weight</div>
                        <Field className='max-w-[200px]'>
                            <FieldLabel className='sr-only'>Heading weight</FieldLabel>
                            <Select value={getSelectedFontWeightOption().value} onValueChange={value => updateNewsletter({title_font_weight: value})}>
                                <SelectTrigger aria-label='Heading weight'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {headingFontWeightOptions.map(option => <SelectItem key={option.value} value={option.value}><span className={option.className}>{option.label}</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    <div className='flex w-full items-center justify-between gap-2'>
                        <div className='shrink-0'>Body font</div>
                        <Field className='max-w-[200px]'>
                            <FieldLabel className='sr-only'>Body font</FieldLabel>
                            <Select value={newsletter.body_font_category} onValueChange={value => updateNewsletter({body_font_category: value})}>
                                <SelectTrigger aria-label='Body font' data-testid='body-font-select'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {fontOptions.map(option => <SelectItem key={option.value} value={option.value}><span className={option.className}>{option.label}</span></SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </div>
                    </FieldGroup>
                </FieldSet>
                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Header</FieldLegend>
                    <FieldGroup className='mb-12 gap-4'>
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
                        <IconToggleGroup
                            label='Title alignment'
                            options={[
                                {value: 'left', label: 'Left', icon: <LucideIcon.AlignLeft className='size-3.5!' />, disabled: !newsletter.show_post_title_section},
                                {value: 'center', label: 'Center', icon: <LucideIcon.AlignCenter className='size-3.5!' />, disabled: !newsletter.show_post_title_section}
                            ]}
                            value={newsletter.title_alignment}
                            onValueChange={titleAlignment => updateNewsletter({title_alignment: titleAlignment})}
                        />
                    </div>
                    </FieldGroup>
                </FieldSet>

                <FieldSet className='mt-6 gap-0'>
                    <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Body</FieldLegend>
                    <FieldGroup className='mb-12 gap-4'>
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
                        <IconToggleGroup
                            label='Button style'
                            options={[
                                {value: 'fill', label: 'Fill', icon: <LucideIcon.Squircle className='size-3.5!' fill='currentColor' />},
                                {value: 'outline', label: 'Outline', icon: <LucideIcon.Squircle className='size-3.5!' />}
                            ]}
                            value={newsletter.button_style || 'fill'}
                            onValueChange={buttonStyle => updateNewsletter({button_style: buttonStyle})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Button corners</div>
                        <IconToggleGroup
                            label='Button corners'
                            options={[
                                {value: 'square', label: 'Squared', icon: <LucideIcon.Square className='size-3.5!' />},
                                {value: 'rounded', label: 'Rounded', icon: <LucideIcon.Squircle className='size-3.5!' />},
                                {value: 'pill', label: 'Pill', icon: <LucideIcon.Circle className='size-3.5!' />}
                            ]}
                            value={newsletter.button_corners || 'rounded'}
                            onValueChange={buttonCorners => updateNewsletter({button_corners: buttonCorners})}
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
                            title='Link color'
                            value={newsletter.link_color}
                            onChange={color => updateNewsletter({link_color: color})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Link style</div>
                        <IconToggleGroup
                            label='Link style'
                            options={[
                                {value: 'underline', label: 'Underline', icon: <LucideIcon.Underline className='size-3.5!' />},
                                {value: 'regular', label: 'Regular', icon: <LucideIcon.Type className='size-3.5!' />},
                                {value: 'bold', label: 'Bold', icon: <LucideIcon.Bold className='size-3.5!' />}
                            ]}
                            value={newsletter.link_style || 'underline'}
                            onValueChange={linkStyle => updateNewsletter({link_style: linkStyle})}
                        />
                    </div>
                    <div className='flex w-full justify-between'>
                        <div>Image corners</div>
                        <IconToggleGroup
                            label='Image corners'
                            options={[
                                {value: 'square', label: 'Squared', icon: <LucideIcon.Square className='size-3.5!' />},
                                {value: 'rounded', label: 'Rounded', icon: <LucideIcon.Squircle className='size-3.5!' />}
                            ]}
                            value={newsletter.image_corners || 'square'}
                            onValueChange={imageCorners => updateNewsletter({image_corners: imageCorners})}
                        />
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
                    </FieldGroup>
                </FieldSet>
            </>
        }
    ];

    const handleTabChange = (id: string) => {
        setSelectedTab(id);
    };

    return (
        <div className='flex flex-col'>
            <div className='px-7 pt-0 pb-7'>
                <Tabs value={selectedTab} variant='underline' onValueChange={handleTabChange}>
                    <TabsList className='sticky top-0 z-50 bg-surface-elevated-2'>
                        {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id}>{tab.title}</TabsTrigger>)}
                    </TabsList>
                    {tabs.map(tab => <TabsContent key={tab.id} value={tab.id}>{tab.contents}</TabsContent>)}
                </Tabs>
            </div>
        </div>
    );
};

const NewsletterDetailModalContent: React.FC<{newsletter: Newsletter; onlyOne: boolean;}> = ({newsletter, onlyOne}) => {
    const {config} = useGlobalData();
    const {mutateAsync: editNewsletter} = useEditNewsletter();
    const {updateRoute} = useRouting();
    const returnRoute = useFeatureFlag('automations') ? 'emails' : 'newsletters';
    const handleError = useHandleError();

    const {formState, saveState, updateForm, setFormState, handleSave, validate, errors, clearError, okProps} = useForm({
        initialState: newsletter,
        savingDelay: 500,
        onSave: async () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            const {meta: {sent_email_verification: [emailToVerify] = []} = {}} = await editNewsletter(formState); ``;
            let toastMessage;

            if (emailToVerify && emailToVerify === 'sender_email') {
                toastMessage = <div>We&lsquo;ve sent a confirmation email to the new address.</div>;
            } else if (emailToVerify && emailToVerify === 'sender_reply_to') {
                toastMessage = <div>We&lsquo;ve sent a confirmation email to the new address.</div>;
            }

            if (toastMessage) {
                toast.info(toastMessage);
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
        afterClose={() => updateRoute(returnRoute)}
        buttonsDisabled={okProps.disabled}
        cancelLabel='Close'
        dirty={saveState === 'unsaved'}
        okLabel={okProps.label || 'Save'}
        okVariant={okProps.variant}
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
