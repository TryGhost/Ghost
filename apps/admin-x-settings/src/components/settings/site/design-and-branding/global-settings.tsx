import ColorPickerField from '../../../color-picker-field';
import React, {useState} from 'react';
import UnsplashSelector from '../../../selectors/unsplash-selector';
import clsx from 'clsx';
import usePinturaEditor from '../../../../hooks/use-pintura-editor';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {CUSTOM_FONTS} from '@tryghost/custom-fonts';
import {Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Images, Pencil, Trash2} from 'lucide-react';
import {type SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {type Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {formatNumber} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFramework} from '@tryghost/admin-x-framework';
import {useGlobalData} from '../../../providers/global-data-provider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {BodyFontName, HeadingFontName} from '@tryghost/custom-fonts';

interface FontSelectOption {
    className?: string;
    hint?: string;
    label: string;
    value: string;
}

type BodyFontOption = FontSelectOption & {
    value: BodyFontName | typeof DEFAULT_FONT,
    label: BodyFontName | typeof DEFAULT_FONT,
};
type HeadingFontOption = FontSelectOption & {
    value: HeadingFontName | typeof DEFAULT_FONT,
    label: HeadingFontName | typeof DEFAULT_FONT,
};

export interface GlobalSettingValues {
    description: string
    accentColor: string
    icon: string | null
    logo: string | null
    coverImage: string | null
    headingFont: string
    bodyFont: string
}
/**
 * All custom fonts are maintained in the @tryghost/custom-fonts package.
 * If you need to change a font, you'll need to update the @tryghost/custom-fonts package.
 */
const DEFAULT_FONT = 'Theme default';

const FontOption: React.FC<{option: FontSelectOption, selected?: boolean}> = ({option, selected}) => (
    <span className={`flex w-full gap-4 ${option.className ?? ''}`} data-testid={selected ? 'select-current-option' : 'select-option'} data-value={option.value}>
        <span className='flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-2xl font-bold'>Aa</span>
        <span className='flex min-w-0 flex-col'>
            <span className='text-md'>{option.label}</span>
            <span className='truncate font-sans text-sm font-normal text-muted-foreground'>{option.hint}</span>
        </span>
    </span>
);

const capitalizeWords = (str: string): string => str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const GlobalSettings: React.FC<{ values: GlobalSettingValues, updateSetting: (key: string, value: SettingValue) => void }> = ({values,updateSetting}) => {
    const {mutateAsync: uploadImage} = useUploadImage();
    const {settings} = useGlobalData();
    const [unsplashEnabled] = getSettingValues<boolean>(settings, ['unsplash']);
    const [showUnsplash, setShowUnsplash] = useState<boolean>(false);
    const {unsplashConfig} = useFramework();
    const handleError = useHandleError();

    const editor = usePinturaEditor();

    const {data: themesData} = useBrowseThemes();
    const activeTheme = themesData?.themes.find((theme: Theme) => theme.active);
    const themeNameVersion = activeTheme ? `${capitalizeWords(activeTheme.name)} (v${activeTheme.package?.version || '1.0'})` : 'Loading...';

    const [headingFont, setHeadingFont] = useState(CUSTOM_FONTS.heading.find(f => f.name === values.headingFont) || {name: DEFAULT_FONT, creator: themeNameVersion});
    const [bodyFont, setBodyFont] = useState(CUSTOM_FONTS.heading.find(f => f.name === values.bodyFont) || {name: DEFAULT_FONT, creator: themeNameVersion});

    /**
     * TODO: We tried to use the getCSSFriendlyFontClassName function from the @tryghost/custom-fonts package,
     * but this is not working with Tailwind CSS, as tailwind requires to have the class name already in the
     * file to be able to generate the styles.
     *
     * So we need to manually map the font names to the corresponding Tailwind CSS class names.
     */
    const fontClassName = (fontName: string, heading: boolean = true) => {
        let className = '';
        if (fontName === 'Cardo') {
            className = clsx('font-cardo', heading && 'font-bold');
        } else if (fontName === 'Manrope') {
            className = clsx('font-manrope', heading && 'font-bold');
        } else if (fontName === 'Merriweather') {
            className = clsx('font-merriweather', heading && 'font-bold');
        } else if (fontName === 'Nunito') {
            className = clsx('font-nunito', heading && 'font-semibold');
        } else if (fontName === 'Old Standard TT') {
            className = clsx('font-old-standard-tt', heading && 'font-bold');
        } else if (fontName === 'Prata') {
            className = clsx('font-prata', heading && 'font-normal');
        } else if (fontName === 'Roboto') {
            className = clsx('font-roboto', heading && 'font-bold');
        } else if (fontName === 'Rufina') {
            className = clsx('font-rufina', heading && 'font-bold');
        } else if (fontName === 'Tenor Sans') {
            className = clsx('font-tenor-sans', heading && 'font-normal');
        } else if (fontName === 'Chakra Petch') {
            className = clsx('font-chakra-petch', heading && 'font-normal');
        } else if (fontName === 'Fira Mono') {
            className = clsx('font-fira-mono', heading && 'font-bold');
        } else if (fontName === 'Fira Sans') {
            className = clsx('font-fira-sans', heading && 'font-bold');
        } else if (fontName === 'IBM Plex Serif') {
            className = clsx('font-ibm-plex-serif', heading && 'font-bold');
        } else if (fontName === 'Inter') {
            className = clsx('font-inter', heading && 'font-bold');
        } else if (fontName === 'JetBrains Mono') {
            className = clsx('font-jetbrains-mono', heading && 'font-bold');
        } else if (fontName === 'Lora') {
            className = clsx('font-lora', heading && 'font-bold');
        } else if (fontName === 'Noto Sans') {
            className = clsx('font-noto-sans', heading && 'font-bold');
        } else if (fontName === 'Noto Serif') {
            className = clsx('font-noto-serif', heading && 'font-bold');
        } else if (fontName === 'Poppins') {
            className = clsx('font-poppins', heading && 'font-bold');
        } else if (fontName === 'Space Grotesk') {
            className = clsx('font-space-grotesk', heading && 'font-bold');
        } else if (fontName === 'Space Mono') {
            className = clsx('font-space-mono', heading && 'font-bold');
        }
        return className;
    };

    // Populate the heading and body font options
    const customHeadingFonts: HeadingFontOption[] = CUSTOM_FONTS.heading.map((x) => {
        const className = fontClassName(x.name, true);
        return {label: x.name, value: x.name, hint: x.creator, className};
    });
    customHeadingFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT, hint: themeNameVersion, className: 'font-sans font-normal'});

    const customBodyFonts: BodyFontOption[] = CUSTOM_FONTS.body.map((x) => {
        const className = fontClassName(x.name, false);
        return {label: x.name, value: x.name, hint: x.creator, className};
    });
    customBodyFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT, hint: themeNameVersion, className: 'font-sans font-normal'});

    const selectFont = (fontName: string, heading: boolean) => {
        if (fontName === DEFAULT_FONT) {
            return '';
        }
        return fontClassName(fontName, heading);
    };

    const selectedHeadingFont = customHeadingFonts.find(option => option.value === headingFont.name) || customHeadingFonts[0];
    const selectedBodyFont = customBodyFonts.find(option => option.value === bodyFont.name) || customBodyFonts[0];

    return (
        <>
            <FieldGroup className='mt-6 mb-12 gap-6'>
                <ColorPickerField
                    debounceMs={200}
                    direction='rtl'
                    testId='accent-color-picker'
                    title={<div>Accent color</div>}
                    value={values.accentColor}
                    // we debounce this because the color picker fires a lot of events.
                    onChange={value => updateSetting('accent_color', value)}
                />
                <div className='flex items-start justify-between'>
                    <div>
                        <div>Publication icon</div>
                        <FieldDescription className='mr-5 max-w-[160px]'>A square, social icon, at least {formatNumber(60)}×{formatNumber(60)}px</FieldDescription>
                    </div>
                    <div className='flex gap-3'>
                        <ImageUpload className={values.icon ? 'size-16.5' : 'h-9 w-40'}>
                            {values.icon ? (
                                <ImageUploadPreview background='checkerboard'>
                                    <ImageUploadImage id='logo' src={values.icon} />
                                    <ImageUploadActions className='top-1 right-1'>
                                        <ImageUploadAction aria-label='Remove publication icon' data-testid='image-delete-button' onClick={() => updateSetting('icon', null)}><Trash2 /></ImageUploadAction>
                                    </ImageUploadActions>
                                </ImageUploadPreview>
                            ) : (
                                <ImageUploadDropzone inputId='logo' onDropAccepted={async ([file]) => {
                                    try {
                                        updateSetting('icon', getImageUrl(await uploadImage({file})));
                                    } catch (e) {
                                        const error = e as APIError;
                                        if (error.response!.status === 415) {
                                            error.message = 'Unsupported file type';
                                        }
                                        handleError(error);
                                    }
                                }}>Upload icon</ImageUploadDropzone>
                            )}
                        </ImageUpload>
                    </div>
                </div>
                <div className={`flex items-start justify-between ${values.icon && 'mt-2'}`}>
                    <div>
                        <div>Publication logo</div>
                        <FieldDescription className='mr-5 max-w-[160px]'>Appears usually in the main header of your theme</FieldDescription>
                    </div>
                    <div>
                        <ImageUpload className='h-15 w-40'>
                            {values.logo ? (
                                <ImageUploadPreview background='checkerboard'>
                                    <ImageUploadImage className='object-contain' id='site-logo' src={values.logo} />
                                    <ImageUploadActions className='top-1 right-1'>
                                        <ImageUploadAction aria-label='Remove publication logo' data-testid='image-delete-button' onClick={() => updateSetting('logo', null)}><Trash2 /></ImageUploadAction>
                                    </ImageUploadActions>
                                </ImageUploadPreview>
                            ) : (
                                <ImageUploadDropzone inputId='site-logo' onDropAccepted={async ([file]) => {
                                    try {
                                        updateSetting('logo', getImageUrl(await uploadImage({file})));
                                    } catch (e) {
                                        const error = e as APIError;
                                        if (error.response!.status === 415) {
                                            error.message = 'Unsupported file type';
                                        }
                                        handleError(error);
                                    }
                                }}>Upload logo</ImageUploadDropzone>
                            )}
                        </ImageUpload>
                    </div>
                </div>
                <div className='mt-2 flex items-start justify-between' data-testid="publication-cover">
                    <div>
                        <div>Publication cover</div>
                        <FieldDescription className='mr-5 max-w-[160px]'>Usually as a large banner image on your index pages</FieldDescription>
                    </div>
                    <ImageUpload className='h-23.75 w-40'>
                        {values.coverImage ? (
                            <ImageUploadPreview>
                                <ImageUploadImage id='cover' src={values.coverImage} />
                                <ImageUploadActions className='top-1 right-1'>
                                    {editor.isEnabled && <ImageUploadAction aria-label='Edit publication cover' onClick={() => editor.openEditor({
                                        image: values.coverImage || '',
                                        handleSave: async (file: File) => {
                                            try {
                                                updateSetting('cover_image', getImageUrl(await uploadImage({file})));
                                            } catch (e) {
                                                handleError(e);
                                            }
                                        }
                                    })}><Pencil /></ImageUploadAction>}
                                    <ImageUploadAction aria-label='Remove publication cover' data-testid='image-delete-button' onClick={() => updateSetting('cover_image', null)}><Trash2 /></ImageUploadAction>
                                </ImageUploadActions>
                            </ImageUploadPreview>
                        ) : (
                            <>
                                <ImageUploadDropzone inputId='cover' onDropAccepted={async ([file]) => {
                                    try {
                                        updateSetting('cover_image', getImageUrl(await uploadImage({file})));
                                    } catch (e) {
                                        const error = e as APIError;
                                        if (error.response!.status === 415) {
                                            error.message = 'Unsupported file type';
                                        }
                                        handleError(error);
                                    }
                                }}>Upload cover</ImageUploadDropzone>
                                {unsplashEnabled && <ImageUploadActions className='top-1 right-1 opacity-100'>
                                    <ImageUploadAction aria-label='Select publication cover from Unsplash' data-testid='toggle-unsplash-button' onClick={() => setShowUnsplash(true)}><Images /></ImageUploadAction>
                                </ImageUploadActions>}
                            </>
                        )}
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
            </FieldGroup>
            <FieldSet className='-mt-4 gap-0'>
                <FieldLegend className='mb-4 text-md! leading-supertight font-bold md:text-lg!'>Typography</FieldLegend>
                <FieldGroup className='mb-12 gap-6'>
                <Field>
                    <FieldLabel>Heading font</FieldLabel>
                    <Select value={selectedHeadingFont.value} onValueChange={(value) => {
                        if (value === DEFAULT_FONT) {
                            setHeadingFont({name: DEFAULT_FONT, creator: themeNameVersion});
                            updateSetting('heading_font', '');
                        } else {
                            setHeadingFont({name: value, creator: CUSTOM_FONTS.heading.find(f => f.name === value)?.creator || ''});
                            updateSetting('heading_font', value);
                        }
                    }}>
                        <SelectTrigger aria-label='Heading font' className={`h-16 pl-2 ${selectFont(selectedHeadingFont.label, true)}`} data-testid='heading-font-select'>
                            <SelectValue><FontOption option={selectedHeadingFont} selected /></SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {customHeadingFonts.map(option => <SelectItem key={option.value} value={option.value}><FontOption option={option} /></SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                <Field>
                    <FieldLabel>Body font</FieldLabel>
                    <Select value={selectedBodyFont.value} onValueChange={(value) => {
                        if (value === DEFAULT_FONT) {
                            setBodyFont({name: DEFAULT_FONT, creator: themeNameVersion});
                            updateSetting('body_font', '');
                        } else {
                            setBodyFont({name: value, creator: CUSTOM_FONTS.body.find(f => f.name === value)?.creator || ''});
                            updateSetting('body_font', value);
                        }
                    }}>
                        <SelectTrigger aria-label='Body font' className={`h-16 pl-2 ${selectFont(selectedBodyFont.label, false)}`} data-testid='body-font-select'>
                            <SelectValue><FontOption option={selectedBodyFont} selected /></SelectValue>
                        </SelectTrigger>
                        <SelectContent className='max-h-52'>
                            {customBodyFonts.map(option => <SelectItem key={option.value} value={option.value}><FontOption option={option} /></SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                </FieldGroup>
            </FieldSet>
        </>
    );
};

export default GlobalSettings;
