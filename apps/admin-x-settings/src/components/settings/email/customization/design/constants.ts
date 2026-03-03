import type {BaseEmailDesignFormState, EmailFontCategory, EmailTitleFontWeight, NewsletterDesignFormState} from '../types';
import type {SelectOption} from '@tryghost/admin-x-design-system';

type FontWeightConfig = {
    options: SelectOption[];
    map?: Partial<Record<EmailTitleFontWeight, EmailTitleFontWeight>>;
};

export const fontOptions: SelectOption[] = [
    {value: 'serif', label: 'Elegant serif', className: 'font-serif'},
    {value: 'sans_serif', label: 'Clean sans-serif'}
];

export const fontWeightOptionsByCategory: Record<EmailFontCategory, FontWeightConfig> = {
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

export const DEFAULT_NEWSLETTER_DESIGN_VALUES: BaseEmailDesignFormState & NewsletterDesignFormState = {
    background_color: 'light',
    header_background_color: 'transparent',
    header_image: '',
    title_font_category: 'sans_serif',
    title_font_weight: 'bold',
    body_font_category: 'sans_serif',
    post_title_color: null,
    title_alignment: 'center',
    section_title_color: null,
    button_color: 'accent',
    button_style: 'fill',
    button_corners: 'rounded',
    link_color: 'accent',
    link_style: 'underline',
    image_corners: 'square',
    divider_color: null
};

export const DEFAULT_AUTOMATION_DESIGN_VALUES: BaseEmailDesignFormState = {
    background_color: 'light',
    header_background_color: 'transparent',
    header_image: '',
    title_font_category: 'sans_serif',
    title_font_weight: 'bold',
    body_font_category: 'sans_serif',
    section_title_color: null,
    button_color: 'accent',
    button_style: 'fill',
    button_corners: 'rounded',
    link_color: 'accent',
    link_style: 'underline',
    image_corners: 'square',
    divider_color: null
};

export const backgroundColorSwatches = [{
    hex: '#ffffff',
    value: 'light',
    title: 'White'
}];

export const headerBackgroundColorSwatches = [{
    hex: '#00000000',
    value: 'transparent',
    title: 'Transparent'
}];

export const dividerColorSwatches = (accentColor: string) => [
    {
        value: 'light',
        title: 'Light',
        hex: '#e0e7eb'
    },
    {
        value: 'accent',
        title: 'Accent',
        hex: accentColor
    }
];

export const autoAccentSwatches = (accentColor: string, autoHex: string) => [
    {
        value: null,
        title: 'Auto',
        hex: autoHex
    },
    {
        value: 'accent',
        title: 'Accent',
        hex: accentColor
    }
];

export const accentAutoSwatches = (accentColor: string, autoHex: string) => [
    {
        value: 'accent',
        title: 'Accent',
        hex: accentColor
    },
    {
        value: null,
        title: 'Auto',
        hex: autoHex
    }
];
