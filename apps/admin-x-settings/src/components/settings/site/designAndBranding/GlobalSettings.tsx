import React, {useState} from 'react';
import UnsplashSelector from '../../../selectors/UnsplashSelector';
import clsx from 'clsx';
import usePinturaEditor from '../../../../hooks/usePinturaEditor';
import {APIError} from '@tryghost/admin-x-framework/errors';
import {CUSTOM_FONTS} from '@tryghost/custom-fonts';
import {ColorPickerField, Form, Hint, ImageUpload, Select} from '@tryghost/admin-x-design-system';
import {Icon} from '@tryghost/admin-x-design-system';
import {OptionProps, SingleValueProps, components} from 'react-select';
import {SettingValue, getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {Theme, useBrowseThemes} from '@tryghost/admin-x-framework/api/themes';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFramework} from '@tryghost/admin-x-framework';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {BodyFontName, HeadingFontName} from '@tryghost/custom-fonts';

type BodyFontOption = {
    value: BodyFontName | typeof DEFAULT_FONT,
    label: BodyFontName | typeof DEFAULT_FONT,
    creator?: string,
    className?: string
};
type HeadingFontOption = {
    value: HeadingFontName | typeof DEFAULT_FONT,
    label: HeadingFontName | typeof DEFAULT_FONT,
    creator?: string,
    className?: string
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

interface FontSelectOption {
    value: string;
    label: string;
    hint?: string;
    key?: string;
    className?: string;
    creator?: string;
}

const SingleValue: React.FC<SingleValueProps<FontSelectOption, false>> = ({children, ...optionProps}) => (
    <components.SingleValue {...optionProps}>
        <div className='group' data-testid="select-current-option" data-value={optionProps.data.value}>
            <div className='flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-md bg-white text-2xl font-bold dark:bg-black'>Aa</div>
                <div className='flex flex-col'>
                    <span className='text-md'>{children}</span>
                    <span className='font-sans text-xs font-normal text-grey-700 dark:text-grey-600'>{optionProps.data.creator}</span>
                </div>
            </div>
        </div>
    </components.SingleValue>
);

const Option: React.FC<OptionProps<FontSelectOption, false>> = ({children, ...optionProps}) => (
    <components.Option {...optionProps}>
        <div className={optionProps.isSelected ? 'relative flex w-full items-center justify-between gap-2' : 'group'} data-testid="select-option" data-value={optionProps.data.value}>
            <div className='flex items-center gap-3'>
                <div className='dark:group-hover:bg-grey-800 flex h-12 w-12 items-center justify-center rounded-md bg-grey-150 text-2xl font-bold group-hover:bg-grey-250 dark:bg-grey-900'>Aa</div>
                <div className='flex flex-col'>
                    <span className='text-md'>{children}</span>
                    <span className='font-sans text-xs font-normal text-grey-700 dark:text-grey-600'>{optionProps.data.creator}</span>
                </div>
            </div>
            {optionProps.isSelected && <span><Icon name='check' size={14} /></span>}
        </div>
    </components.Option>
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
        let className = fontClassName(x.name, true);
        return {label: x.name, value: x.name, creator: x.creator, className};
    });
    customHeadingFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT, creator: themeNameVersion, className: 'font-sans font-normal'});

    const customBodyFonts: BodyFontOption[] = CUSTOM_FONTS.body.map((x) => {
        let className = fontClassName(x.name, false);
        return {label: x.name, value: x.name, creator: x.creator, className};
    });
    customBodyFonts.unshift({label: DEFAULT_FONT, value: DEFAULT_FONT, creator: themeNameVersion, className: 'font-sans font-normal'});

    const selectFont = (fontName: string, heading: boolean) => {
        if (fontName === DEFAULT_FONT) {
            return '';
        }
        return fontClassName(fontName, heading);
    };

    const selectedHeadingFont = {label: headingFont.name, value: headingFont.name, creator: headingFont.creator};
    const selectedBodyFont = {label: bodyFont.name, value: bodyFont.name, creator: bodyFont.creator};

    return (
        <>
            <Form className='mt-4' gap='sm' margins='lg' title=''>
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
                        <div>Publication logo</div>
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
                        <div>Publication cover</div>
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
                    className={selectFont(selectedHeadingFont.label, true)}
                    components={{Option, SingleValue}}
                    controlClasses={{control: '!min-h-16 !pl-2', option: '!pl-2'}}
                    hint={''}
                    menuShouldScrollIntoView={true}
                    options={customHeadingFonts}
                    selectedOption={selectedHeadingFont}
                    testId='heading-font-select'
                    title={'Heading font'}
                    onSelect={(option) => {
                        if (option?.value === DEFAULT_FONT) {
                            setHeadingFont({name: DEFAULT_FONT, creator: themeNameVersion});
                            updateSetting('heading_font', '');
                        } else {
                            setHeadingFont({name: option?.value || '', creator: CUSTOM_FONTS.heading.find(f => f.name === option?.value)?.creator || ''});
                            updateSetting('heading_font', option?.value || '');
                        }
                    }}
                />
                <Select
                    className={selectFont(selectedBodyFont.label, false)}
                    components={{Option, SingleValue}}
                    controlClasses={{control: '!min-h-16 !pl-2', option: '!pl-2'}}
                    hint={''}
                    maxMenuHeight={200}
                    menuPosition='fixed'
                    menuShouldScrollIntoView={true}
                    options={customBodyFonts}
                    selectedOption={selectedBodyFont}
                    testId='body-font-select'
                    title={'Body font'}
                    onSelect={(option) => {
                        if (option?.value === DEFAULT_FONT) {
                            setBodyFont({name: DEFAULT_FONT, creator: themeNameVersion});
                            updateSetting('body_font', '');
                        } else {
                            setBodyFont({name: option?.value || '', creator: CUSTOM_FONTS.body.find(f => f.name === option?.value)?.creator || ''});
                            updateSetting('body_font', option?.value || '');
                        }
                    }}
                />
            </Form>
        </>
    );
};

export default GlobalSettings;
