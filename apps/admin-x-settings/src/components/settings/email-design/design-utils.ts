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

const VALID_HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;

function resolveBackgroundColor(value: string): string {
    if (VALID_HEX.test(value)) {
        return value;
    }
    return '#ffffff';
}

function resolveHeaderBackgroundColor(value: string, accentColor: string): string {
    if (!value || value === 'transparent') {
        return 'transparent';
    }
    if (value === 'accent') {
        return accentColor;
    }
    if (VALID_HEX.test(value)) {
        return value;
    }
    return 'transparent';
}

function resolveButtonColor(value: string | null, accentColor: string, bgColor: string): string {
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === null) {
        return textColorForBackgroundColor(bgColor).hex();
    }
    return accentColor;
}

function resolveButtonTextColor(buttonStyle: string, buttonColor: string): string | undefined {
    if (buttonStyle === 'fill') {
        return textColorForBackgroundColor(buttonColor).hex();
    }
    return undefined;
}

function resolveLinkColor(value: string | null | undefined, accentColor: string, bgColor: string): string {
    const resolved = value === undefined ? 'accent' : value;
    if (resolved === 'accent') {
        return accentColor;
    }
    if (VALID_HEX.test(resolved || '')) {
        return resolved!;
    }
    return textColorForBackgroundColor(bgColor).hex();
}

function resolvePostTitleColor(value: string | null, accentColor: string, bgColor: string, headerBgColor: string): string {
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    const effectiveBg = headerBgColor === 'transparent' ? bgColor : headerBgColor;
    return textColorForBackgroundColor(effectiveBg).hex();
}

function resolveSectionTitleColor(value: string | null, accentColor: string, bgColor: string): string {
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    return textColorForBackgroundColor(bgColor).hex();
}

function resolveDividerColor(value: string | null, accentColor: string): string {
    if (VALID_HEX.test(value || '')) {
        return value!;
    }
    if (value === 'accent') {
        return accentColor;
    }
    return '#e0e7eb';
}

export function resolveAllColors(settings: EmailDesignSettings, accentColor: string): ResolvedEmailColors {
    const bgColor = resolveBackgroundColor(settings.background_color);
    const headerBgColor = resolveHeaderBackgroundColor(settings.header_background_color, accentColor);
    const buttonColor = resolveButtonColor(settings.button_color, accentColor, bgColor);

    const textColor = textColorForBackgroundColor(bgColor).hex();
    const secondaryTextColor = textColorForBackgroundColor(bgColor).alpha(0.5).toString();
    const headerTextColor = headerBgColor === 'transparent' ? textColor : textColorForBackgroundColor(headerBgColor).hex();
    const secondaryHeaderTextColor = headerBgColor === 'transparent' ? secondaryTextColor : textColorForBackgroundColor(headerBgColor).alpha(0.5).toString();

    return {
        backgroundColor: bgColor,
        headerBackgroundColor: headerBgColor,
        postTitleColor: resolvePostTitleColor(settings.post_title_color, accentColor, bgColor, headerBgColor),
        sectionTitleColor: resolveSectionTitleColor(settings.section_title_color, accentColor, bgColor),
        buttonColor,
        buttonTextColor: resolveButtonTextColor(settings.button_style, buttonColor),
        linkColor: resolveLinkColor(settings.link_color, accentColor, bgColor),
        dividerColor: resolveDividerColor(settings.divider_color, accentColor),
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor
    };
}

export function resolveFontFamily(category: string | undefined) {
    return category === 'serif' ? 'Georgia, serif' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

export function resolveButtonCorners(corners: string | undefined): string {
    switch (corners) {
    case 'square': return 'rounded-none';
    case 'pill': return 'rounded-full';
    case 'rounded':
    default: return 'rounded-[6px]';
    }
}

export function resolveImageCorners(corners: string | undefined): string {
    return corners === 'rounded' ? 'rounded-md' : '';
}
