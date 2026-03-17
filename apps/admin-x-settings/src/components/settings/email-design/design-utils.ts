import {textColorForBackgroundColor} from '@tryghost/color-utils';
import type {EmailDesignSettings} from './types';

export interface ResolvedEmailColors {
    backgroundColor: string;
    headerBackgroundColor: string;
    postTitleColor: string;
    sectionTitleColor: string;
    buttonColor: string;
    buttonTextColor: string | undefined;
    linkColor: string;
    dividerColor: string;
    textColor: string;
    secondaryTextColor: string;
    headerTextColor: string;
    secondaryHeaderTextColor: string;
}

const VALID_HEX = /#([0-9a-f]{3}){1,2}$/i;

function resolveBackgroundColor(settings: EmailDesignSettings): string {
    if (VALID_HEX.test(settings.background_color)) {
        return settings.background_color;
    }
    return '#ffffff';
}

function resolveHeaderBackgroundColor(settings: EmailDesignSettings): string {
    const value = settings.header_background_color;
    if (!value || value === 'transparent') {
        return 'transparent';
    }
    if (VALID_HEX.test(value)) {
        return value;
    }
    return 'transparent';
}

function resolveButtonColor(settings: EmailDesignSettings, accentColor: string, bgColor: string): string {
    const value = settings.button_color;
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === null) {
        return textColorForBackgroundColor(bgColor).hex();
    }
    return accentColor;
}

function resolveButtonTextColor(settings: EmailDesignSettings, buttonColor: string): string | undefined {
    if (settings.button_style === 'fill') {
        return textColorForBackgroundColor(buttonColor).hex();
    }
    return undefined;
}

function resolveLinkColor(settings: EmailDesignSettings, accentColor: string, bgColor: string): string {
    const value = settings.link_color === undefined ? 'accent' : settings.link_color;
    if (value === 'accent') {
        return accentColor;
    }
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    return textColorForBackgroundColor(bgColor).hex();
}

function resolvePostTitleColor(settings: EmailDesignSettings, accentColor: string, bgColor: string, headerBgColor: string): string {
    const value = settings.post_title_color;
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    const effectiveBg = headerBgColor === 'transparent' ? bgColor : headerBgColor;
    return textColorForBackgroundColor(effectiveBg).hex();
}

function resolveSectionTitleColor(settings: EmailDesignSettings, accentColor: string, bgColor: string): string {
    const value = settings.section_title_color;
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    return textColorForBackgroundColor(bgColor).hex();
}

function resolveDividerColor(settings: EmailDesignSettings, accentColor: string): string {
    const value = settings.divider_color;
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    return '#e0e7eb';
}

export function resolveAllColors(settings: EmailDesignSettings, accentColor: string): ResolvedEmailColors {
    const bgColor = resolveBackgroundColor(settings);
    const headerBgColor = resolveHeaderBackgroundColor(settings);
    const buttonColor = resolveButtonColor(settings, accentColor, bgColor);

    const textColor = textColorForBackgroundColor(bgColor).hex();
    const secondaryTextColor = textColorForBackgroundColor(bgColor).alpha(0.5).toString();
    const headerTextColor = headerBgColor === 'transparent' ? textColor : textColorForBackgroundColor(headerBgColor).hex();
    const secondaryHeaderTextColor = headerBgColor === 'transparent' ? secondaryTextColor : textColorForBackgroundColor(headerBgColor).alpha(0.5).toString();

    return {
        backgroundColor: bgColor,
        headerBackgroundColor: headerBgColor,
        postTitleColor: resolvePostTitleColor(settings, accentColor, bgColor, headerBgColor),
        sectionTitleColor: resolveSectionTitleColor(settings, accentColor, bgColor),
        buttonColor,
        buttonTextColor: resolveButtonTextColor(settings, buttonColor),
        linkColor: resolveLinkColor(settings, accentColor, bgColor),
        dividerColor: resolveDividerColor(settings, accentColor),
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor
    };
}
