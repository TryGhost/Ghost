export interface PersistedEmailDesignSettings {
    background_color: string;
    title_font_category: string;
    title_font_weight: string;
    body_font_category: string;
    header_background_color: string;
    section_title_color: string | null;
    button_color: string | null;
    button_style: string;
    button_corners: string;
    link_color: string | null;
    link_style: string;
    image_corners: string;
    divider_color: string | null;
}

export interface EmailDesignPreviewSettings {
    post_title_color: string | null;
    title_alignment: string;
}

export type EmailDesignSettings = PersistedEmailDesignSettings & EmailDesignPreviewSettings;

export const DEFAULT_EMAIL_DESIGN: EmailDesignSettings = {
    background_color: 'light',
    title_font_category: 'sans_serif',
    title_font_weight: 'bold',
    body_font_category: 'sans_serif',
    header_background_color: 'transparent',
    section_title_color: null,
    button_color: 'accent',
    button_style: 'fill',
    button_corners: 'rounded',
    link_color: 'accent',
    link_style: 'underline',
    image_corners: 'square',
    divider_color: null,
    post_title_color: null,
    title_alignment: 'center'
};
