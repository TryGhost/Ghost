import React, {useState} from 'react';
import UnsplashSelector from '../../../selectors/UnsplashSelector';
import usePinturaEditor from '../../../../hooks/usePinturaEditor';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {CUSTOM_FONTS} from '@tryghost/custom-fonts';
import {ColorPickerField, Form, Heading, Hint, ImageUpload, Select} from '@tryghost/admin-x-design-system';
import {SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFramework} from '@tryghost/admin-x-framework';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {Font} from '@tryghost/custom-fonts';

// TODO: create custom types for heading and body fonts in @tryghost/custom-fonts, so we can extend
// them separately
type BodyFontOption = {
    value: Font | 'Theme default',
    label: Font | 'Theme default'
};
type HeadingFontOption = BodyFontOption;

export interface BrandSettingValues {
    description: string
    accentColor: string
    icon: string | null
    logo: string | null
    coverImage: string | null
    headingFont: string
    bodyFont: string
}

const DEFAULT_FONT = 'Theme default';

const BrandSettings: React.FC<{ values: BrandSettingValues, updateSetting: (key: string, value: SettingValue) => void }> = ({values,updateSetting}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const {settings} = useGlobalData();
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ['unsplash']);
    const [showUnsplash, setShowUnsplash] = useState<boolean>(false);
    const {unsplashConfig} = useFramework();
    const handleError = useHandleError();

    const editor = usePinturaEditor();

    const [headingFont, setHeadingFont] = useState(values.headingFont || DEFAULT_FONT);
    const [bodyFont, setBodyFont] = useState(values.bodyFont || DEFAULT_FONT);

    // TODO: replace with getCustomFonts() once custom-fonts is updated and differentiates
    // between heading and body fonts
    const customHeadingFonts: HeadingFontOption[] = CUSTOM_FONTS.map(x => ({label: x, value: x}));
    customHeadingFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT});

    const customBodyFonts: BodyFontOption[] = CUSTOM_FONTS.map(x => ({label: x, value: x}));
    customBodyFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT});

    const selectedHeadingFont = {label: headingFont, value: headingFont};
    const selectedBodyFont = {label: bodyFont, value: bodyFont};

    return (
        <>
            <Form className='mt-4' gap='sm' margins='lg' title=''>
                <ColorPickerField
                    debounceMs={200}
                    direction='rtl'
                    title={<Heading className='mt-[3px]' level={6}>Accent color</Heading>}
                    value={values.accentColor}
                    // we debounce this because the color picker fires a lot of events.
                    onChange={value => updateSetting('accent_color', value)}
                />
                <div className='flex items-start justify-between'>
                    <div>
                        <Heading level={6}>Publication icon</Heading>
                        <Hint className='!mt-0 mr-5 max-w-[160px]'>A square, social icon, at least 60x60px</Hint>
                    </div>
                    <div className='flex gap-3'>
                        <ImageUpload
                            deleteButtonClassName='!top-1 !right-1'
                            editButtonClassName='!top-1 !right-1'
                            height={values.icon ? '66px' : '36px'}
                            id='logo'
                            imageBWCheckedBg={true}
                            imageURL={values.icon || ''}
                            width={values.icon ? '66px' : '160px'}
                            onDelete={() => updateSetting('icon', null)}
                            onUpload={async (file) => {
                                try {
                                    updateSetting('icon', getImageUrl(await uploadImage({file})));
                                } catch (e) {
                                    const error = e as APIError;
                                    if (error.response!.status === 415) {
                                        error.message = 'Unsupported file type';
                                    }
                                    handleError(error);
                                }
                            }}
                        >
                        Upload icon
                        </ImageUpload>
                    </div>
                </div>
                <div className={`flex items-start justify-between ${values.icon && 'mt-2'}`}>
                    <div>
                        <Heading level={6}>Publication logo</Heading>
                        <Hint className='!mt-0 mr-5 max-w-[160px]'>Appears usually in the main header of your theme</Hint>
                    </div>
                    <div>
                        <ImageUpload
                            deleteButtonClassName='!top-1 !right-1'
                            height='60px'
                            id='site-logo'
                            imageBWCheckedBg={true}
                            imageFit='contain'
                            imageURL={values.logo || ''}
                            width='160px'
                            onDelete={() => updateSetting('logo', null)}
                            onUpload={async (file) => {
                                try {
                                    updateSetting('logo', getImageUrl(await uploadImage({file})));
                                } catch (e) {
                                    const error = e as APIError;
                                    if (error.response!.status === 415) {
                                        error.message = 'Unsupported file type';
                                    }
                                    handleError(error);
                                }
                            }}
                        >
                        Upload logo
                        </ImageUpload>
                    </div>
                </div>
                <div className='mt-2 flex items-start justify-between'>
                    <div>
                        <Heading level={6}>Publication cover</Heading>
                        <Hint className='!mt-0 mr-5 max-w-[160px]'>Usually as a large banner image on your index pages</Hint>
                    </div>
                    <ImageUpload
                        deleteButtonClassName='!top-1 !right-1'
                        editButtonClassName='!top-1 !right-10'
                        height='95px'
                        id='cover'
                        imageURL={values.coverImage || ''}
                        openUnsplash={() => setShowUnsplash(true)}
                        pintura={
                            {
                                isEnabled: editor.isEnabled,
                                openEditor: async () => editor.openEditor({
                                    image: values.coverImage || '',
                                    handleSave: async (file:File) => {
                                        try {
                                            updateSetting('cover_image', getImageUrl(await uploadImage({file})));
                                        } catch (e) {
                                            handleError(e);
                                        }
                                    }
                                })
                            }
                        }
                        unsplashButtonClassName='!bg-transparent !h-6 !top-1.5 !w-6 !right-1.5 z-50'
                        unsplashEnabled={unsplashEnabled}
                        width='160px'
                        onDelete={() => updateSetting('cover_image', null)}
                        onUpload={async (file: any) => {
                            try {
                                updateSetting('cover_image', getImageUrl(await uploadImage({file})));
                            } catch (e) {
                                const error = e as APIError;
                                if (error.response!.status === 415) {
                                    error.message = 'Unsupported file type';
                                }
                                handleError(error);
                            }
                        }}
                    >
                    Upload cover
                    </ImageUpload>
                    {
                        showUnsplash && unsplashConfig && unsplashEnabled && (
                            <UnsplashSelector
                                unsplashProviderConfig={unsplashConfig}
                                onClose={() => {
                                    setShowUnsplash(false);
                                }}
                                onImageInsert={(image) => {
                                    if (image.src) {
                                        updateSetting('cover_image', image.src);
                                    }
                                    setShowUnsplash(false);
                                }}
                            />
                        )
                    }
                </div>
            </Form>
            <Form className='-mt-4' gap='sm' margins='lg' title='Typography'>
                <Select
                    hint={''}
                    options={customHeadingFonts}
                    selectedOption={selectedHeadingFont}
                    title={'Heading font'}
                    onSelect={(option) => {
                        if (option?.value === DEFAULT_FONT) {
                            setHeadingFont(DEFAULT_FONT);
                            updateSetting('heading_font', '');
                        } else {
                            setHeadingFont(option?.value || '');
                            updateSetting('heading_font', option?.value || '');
                        }
                    }}
                />
                <Select
                    hint={''}
                    options={customBodyFonts}
                    selectedOption={selectedBodyFont}
                    title={'Body font'}
                    onSelect={(option) => {
                        if (option?.value === DEFAULT_FONT) {
                            setBodyFont(DEFAULT_FONT);
                            updateSetting('body_font', '');
                        } else {
                            setBodyFont(option?.value || '');
                            updateSetting('body_font', option?.value || '');
                        }
                    }}
                />
            </Form>
        </>
    );
};

export default BrandSettings;
