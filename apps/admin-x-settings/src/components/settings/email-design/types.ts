export interface EmailDesignSettings {
    background_color: string;
    title_font_category: string;
    title_font_weight: string;
    body_font_category: string;
    header_background_color: string;
    post_title_color: string | null;
    section_title_color: string | null;
    button_color: string | null;
    button_style: string;
    button_corners: string;
    link_color: string | null;
    link_style: string;
    image_corners: string;
    divider_color: string | null;
    divider_style: string;
}

export const DEFAULT_EMAIL_DESIGN: EmailDesignSettings = {
    background_color: '#ffffff',
    title_font_category: 'sans_serif',
    title_font_weight: 'bold',
    body_font_category: 'sans_serif',
    header_background_color: 'transparent',
    post_title_color: null,
    section_title_color: null,
    button_color: null,
    button_style: 'fill',
    button_corners: 'rounded',
    link_color: null,
    link_style: 'underline',
    image_corners: 'square',
    divider_color: null,
    divider_style: 'solid'
};
