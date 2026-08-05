import GiftPreview from './gift-preview';
import NiceModal from '@ebay/nice-modal-react';
import React, {useEffect, useMemo, useState} from 'react';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {type Dirtyable, useForm, useHandleError} from '@tryghost/admin-x-framework/hooks';
import {Field, FieldDescription, FieldError, FieldLabel, Input, Textarea} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {PreviewModalContent} from '@/settings/app/components/settings/preview-modal';
import {type Setting, type SettingValue, getSettingValues, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {Stack} from '@tryghost/shade/primitives';
import {type Tier, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {Trash2} from 'lucide-react';
import {formatNumber} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useGlobalData} from '@/settings/app/components/providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;
const IMAGE_ACCEPT = {'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']};
const IMAGE_TYPE_ERROR = 'Choose a JPG, PNG, GIF, WebP, or SVG image.';

interface GiftSidebarProps {
    localSettings: Setting[];
    updateSetting: (key: string, value: SettingValue) => void;
}

const GiftSidebar: React.FC<GiftSidebarProps> = ({localSettings, updateSetting}) => {
    const {siteData} = useGlobalData();
    const {mutateAsync: uploadImage, isPending: isUploading} = useUploadImage();
    const handleError = useHandleError();
    const [imageError, setImageError] = useState<string>();
    const [giftPageHeading, giftPageDescription, giftPageImage] = getSettingValues<string | null>(
        localSettings,
        ['gift_page_heading', 'gift_page_description', 'gift_page_image']
    );

    const headingValue = giftPageHeading?.toString() || '';
    const descriptionValue = useMemo(() => {
        const stored = giftPageDescription?.toString() || '';
        if (!HTML_TAG_REGEX.test(stored)) {
            return stored;
        }

        const container = document.createElement('div');
        container.innerHTML = stored;
        return container.textContent?.trim() || '';
    }, [giftPageDescription]);
    const defaultHeading = 'Gift a membership';
    const defaultDescription = `Share a full membership to ${siteData?.title || 'your site'} with a friend or colleague`;
    const headingRecommendedLength = 60;
    const descriptionRecommendedLength = 225;

    const handleImageUpload = async (file: File) => {
        setImageError(undefined);
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            updateSetting('gift_page_image', imageUrl);
        } catch (error) {
            handleError(error, {withToast: false});
            setImageError(error instanceof APIError && error.response?.status === 415
                ? `This file type isn't supported. ${IMAGE_TYPE_ERROR}`
                : `We couldn't upload this image. Please try again.`);
        }
    };

    return (
        <Stack className='mt-6' gap='2xl'>
            <Stack gap='xl'>
                <Field data-invalid={Boolean(imageError) || undefined}>
                    <FieldLabel htmlFor='gift-page-image'>Image</FieldLabel>
                    <ImageUpload className={`w-full ${giftPageImage ? 'h-[120px]' : 'h-[52px]'}`}>
                        {giftPageImage ? (
                            <ImageUploadPreview>
                                <ImageUploadImage alt='Gift page image' className='object-contain' src={giftPageImage} />
                                <ImageUploadActions>
                                    <ImageUploadAction aria-label='Remove gift page image' className='top-1! right-1!' type='button' onClick={() => {
                                        setImageError(undefined);
                                        updateSetting('gift_page_image', null);
                                    }}>
                                        <Trash2 />
                                    </ImageUploadAction>
                                </ImageUploadActions>
                            </ImageUploadPreview>
                        ) : (
                            <ImageUploadDropzone
                                accept={IMAGE_ACCEPT}
                                aria-describedby={imageError ? 'gift-page-image-error' : undefined}
                                disabled={isUploading}
                                inputAriaLabel='Upload gift page image'
                                inputId='gift-page-image'
                                inputTestId='gift-page-image-upload'
                                onDropAccepted={files => files[0] && handleImageUpload(files[0])}
                                onDropRejected={() => setImageError(IMAGE_TYPE_ERROR)}
                            >
                                <span className='text-control font-medium'>{isUploading ? 'Uploading...' : 'Upload image'}</span>
                            </ImageUploadDropzone>
                        )}
                    </ImageUpload>
                    <FieldDescription>Shown above the heading at up to {formatNumber(140)}px tall</FieldDescription>
                    <FieldError id='gift-page-image-error'>{imageError}</FieldError>
                </Field>

                <Stack className='gap-1.5' gap='none'>
                    <label className='font-medium' htmlFor='gift-page-heading'>Heading</label>
                    <Input
                        id='gift-page-heading'
                        placeholder={defaultHeading}
                        value={headingValue}
                        onChange={event => updateSetting('gift_page_heading', event.target.value || null)}
                    />
                    <p className='text-sm text-muted-foreground'>
                        Recommended: <strong>{formatNumber(headingRecommendedLength)}</strong> characters. You&apos;ve used <strong className={headingValue.length > headingRecommendedLength ? 'text-destructive' : 'text-state-success'}>{formatNumber(headingValue.length)}</strong>
                    </p>
                </Stack>

                <Stack className='gap-1.5' gap='none'>
                    <label className='font-medium' htmlFor='gift-page-description'>Description</label>
                    <Textarea
                        id='gift-page-description'
                        placeholder={defaultDescription}
                        rows={3}
                        value={descriptionValue}
                        onChange={event => updateSetting('gift_page_description', event.target.value || null)}
                    />
                    <p className='text-sm text-muted-foreground'>
                        Recommended: <strong>{formatNumber(descriptionRecommendedLength)}</strong> characters. You&apos;ve used <strong className={descriptionValue.length > descriptionRecommendedLength ? 'text-destructive' : 'text-state-success'}>{formatNumber(descriptionValue.length)}</strong>
                    </p>
                </Stack>
            </Stack>
        </Stack>
    );
};

const GiftSubscriptionsModal: React.FC = () => {
    const {updateRoute} = useRouting();
    const handleError = useHandleError();
    const {settings} = useGlobalData();
    const {mutateAsync: editSettings} = useEditSettings();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const {formState, setFormState, saveState, handleSave, updateForm, okProps} = useForm({
        initialState: {
            settings: settings as Dirtyable<Setting>[],
            tiers: (allTiers as Tier[]) || []
        },
        savingDelay: 500,
        onSave: async () => {
            const changedSettings = formState.settings.filter(setting => setting.dirty);
            if (!changedSettings.length) {
                return;
            }

            await editSettings(changedSettings);
            setFormState(state => ({
                ...state,
                settings: state.settings.map(setting => ({...setting, dirty: false}))
            }));
        },
        onSaveError: handleError
    });

    useEffect(() => {
        if (!formState.tiers.length && allTiers?.length) {
            setFormState(state => ({...state, tiers: allTiers as Tier[]}));
        }
    }, [allTiers, formState.tiers.length, setFormState]);

    const updateSetting = (key: string, value: SettingValue) => {
        updateForm(state => ({
            ...state,
            settings: state.settings.map(setting => (
                setting.key === key ? {...setting, value, dirty: true} : setting
            ))
        }));
    };

    return (
        <PreviewModalContent
            afterClose={() => updateRoute('gift-subscriptions')}
            buttonsDisabled={okProps.disabled}
            cancelLabel='Close'
            dirty={saveState === 'unsaved'}
            okLabel={okProps.label || 'Save'}
            okVariant={okProps.variant}
            preview={<GiftPreview localSettings={formState.settings} localTiers={formState.tiers} />}
            previewToolbar={false}
            sidebar={<GiftSidebar localSettings={formState.settings} updateSetting={updateSetting} />}
            testId='gift-subscriptions-modal'
            title='Gift subscriptions'
            onOk={async () => {
                await handleSave({force: true});
            }}
        />
    );
};

export default NiceModal.create(GiftSubscriptionsModal);
