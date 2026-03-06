import type {EmailButtonCorners, EmailButtonStyle, EmailFontCategory, EmailImageCorners, EmailLinkStyle, EmailTitleFontWeight} from '../types';

type AutomationDesignState = {
    background_color?: string;
    header_background_color?: string;
    header_image?: string;
    show_header_title?: boolean;
    footer_content?: string;
    title_font_category?: EmailFontCategory;
    title_font_weight?: EmailTitleFontWeight;
    body_font_category?: EmailFontCategory;
    section_title_color?: string | null;
    button_color?: string | null;
    button_style?: EmailButtonStyle;
    button_corners?: EmailButtonCorners;
    link_color?: string | null;
    link_style?: EmailLinkStyle;
    image_corners?: EmailImageCorners;
    divider_color?: string | null;
};

const AUTOMATION_DESIGN_STATE_STORAGE_KEY = 'ghost-admin-x-settings-automation-design-state-v1';

const sanitizeAutomationDesignState = (value: unknown): AutomationDesignState => {
    if (!value || typeof value !== 'object') {
        return {};
    }

    const record = value as Record<string, unknown>;
    const state: AutomationDesignState = {};

    if (typeof record.background_color === 'string') {
        state.background_color = record.background_color;
    }

    if (typeof record.header_background_color === 'string') {
        state.header_background_color = record.header_background_color;
    }

    if (typeof record.header_image === 'string') {
        state.header_image = record.header_image;
    }

    if (typeof record.show_header_title === 'boolean') {
        state.show_header_title = record.show_header_title;
    }

    if (typeof record.footer_content === 'string') {
        state.footer_content = record.footer_content;
    }

    if (typeof record.title_font_category === 'string') {
        state.title_font_category = record.title_font_category as EmailFontCategory;
    }

    if (typeof record.title_font_weight === 'string') {
        state.title_font_weight = record.title_font_weight as EmailTitleFontWeight;
    }

    if (typeof record.body_font_category === 'string') {
        state.body_font_category = record.body_font_category as EmailFontCategory;
    }

    if (record.section_title_color === null || typeof record.section_title_color === 'string') {
        state.section_title_color = record.section_title_color as string | null;
    }

    if (record.button_color === null || typeof record.button_color === 'string') {
        state.button_color = record.button_color as string | null;
    }

    if (typeof record.button_style === 'string') {
        state.button_style = record.button_style as EmailButtonStyle;
    }

    if (typeof record.button_corners === 'string') {
        state.button_corners = record.button_corners as EmailButtonCorners;
    }

    if (record.link_color === null || typeof record.link_color === 'string') {
        state.link_color = record.link_color as string | null;
    }

    if (typeof record.link_style === 'string') {
        state.link_style = record.link_style as EmailLinkStyle;
    }

    if (typeof record.image_corners === 'string') {
        state.image_corners = record.image_corners as EmailImageCorners;
    }

    if (record.divider_color === null || typeof record.divider_color === 'string') {
        state.divider_color = record.divider_color as string | null;
    }

    return state;
};

const readRawAutomationDesignState = (): AutomationDesignState => {
    try {
        const storedValue = localStorage.getItem(AUTOMATION_DESIGN_STATE_STORAGE_KEY);

        if (!storedValue) {
            return {};
        }

        const parsedValue = JSON.parse(storedValue);
        return sanitizeAutomationDesignState(parsedValue);
    } catch {
        return {};
    }
};

export const readAutomationDesignState = (): AutomationDesignState => {
    return readRawAutomationDesignState();
};

export const writeAutomationDesignState = (patch: AutomationDesignState): void => {
    try {
        const existingState = readAutomationDesignState();
        const nextState = {
            ...existingState,
            ...patch
        };

        localStorage.setItem(AUTOMATION_DESIGN_STATE_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
        // Intentionally ignore localStorage failures.
    }
};
