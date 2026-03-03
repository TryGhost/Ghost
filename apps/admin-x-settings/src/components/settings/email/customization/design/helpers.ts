import {fontWeightOptionsByCategory} from './constants';
import {textColorForBackgroundColor} from '@tryghost/color-utils';
import type {BaseEmailDesignFormState, EmailFontCategory, EmailTitleFontWeight, NewsletterDesignFormState} from '../types';

const validHexColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const validHexWithAlpha = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const isHexColor = (value?: string | null): value is string => Boolean(value && validHexColor.test(value));

export const mapFontWeightForCategory = (category: EmailFontCategory, weight: EmailTitleFontWeight): EmailTitleFontWeight => {
    const mappedWeight = fontWeightOptionsByCategory[category].map?.[weight];
    if (mappedWeight) {
        return mappedWeight;
    }

    const validWeight = fontWeightOptionsByCategory[category].options.find(option => option.value === weight);
    if (validWeight) {
        return weight;
    }

    return category === 'serif' ? 'bold' : 'bold';
};

export const normalizeBackgroundColor = (value?: string) => {
    if (!value || value === 'light') {
        return '#ffffff';
    }

    if (validHexColor.test(value)) {
        return value;
    }

    return '#ffffff';
};

export const normalizeHeaderBackgroundColor = (value?: string) => {
    if (!value || value === 'transparent') {
        return 'transparent';
    }

    if (validHexWithAlpha.test(value)) {
        return value;
    }

    return 'transparent';
};

type ResolveSharedPreviewColorsInput = {
    backgroundColorValue: BaseEmailDesignFormState['background_color'];
    headerBackgroundColorValue: BaseEmailDesignFormState['header_background_color'];
    sectionTitleColorValue: BaseEmailDesignFormState['section_title_color'];
    buttonColorValue: BaseEmailDesignFormState['button_color'];
    linkColorValue: BaseEmailDesignFormState['link_color'];
    dividerColorValue: BaseEmailDesignFormState['divider_color'];
    accentColor: string;
};

const resolveSharedPreviewColors = ({
    accentColor,
    backgroundColorValue,
    headerBackgroundColorValue,
    sectionTitleColorValue,
    buttonColorValue,
    linkColorValue,
    dividerColorValue
}: ResolveSharedPreviewColorsInput) => {
    const backgroundColor = normalizeBackgroundColor(backgroundColorValue);
    const headerBackgroundColor = normalizeHeaderBackgroundColor(headerBackgroundColorValue);
    const textColor = textColorForBackgroundColor(backgroundColor).hex();
    const secondaryTextColor = textColorForBackgroundColor(backgroundColor).alpha(0.5).toString();
    const headerTextColor = headerBackgroundColor === 'transparent' ? textColor : textColorForBackgroundColor(headerBackgroundColor).hex();
    const secondaryHeaderTextColor = headerBackgroundColor === 'transparent' ? secondaryTextColor : textColorForBackgroundColor(headerBackgroundColor).alpha(0.5).toString();

    const sectionTitleColor = isHexColor(sectionTitleColorValue)
        ? sectionTitleColorValue
        : sectionTitleColorValue === 'accent'
            ? accentColor
            : textColor;

    const buttonColor = isHexColor(buttonColorValue)
        ? buttonColorValue
        : buttonColorValue === null
            ? textColor
            : accentColor;

    const linkColor = isHexColor(linkColorValue)
        ? linkColorValue
        : linkColorValue === 'accent'
            ? accentColor
            : textColor;

    const dividerColor = isHexColor(dividerColorValue)
        ? dividerColorValue
        : dividerColorValue === 'accent'
            ? accentColor
            : '#e0e7eb';

    return {
        backgroundColor,
        headerBackgroundColor,
        sectionTitleColor,
        buttonColor,
        linkColor,
        dividerColor,
        textColor,
        secondaryTextColor,
        headerTextColor,
        secondaryHeaderTextColor
    };
};

type ResolveNewsletterPreviewColorsInput = ResolveSharedPreviewColorsInput & {
    postTitleColorValue: NewsletterDesignFormState['post_title_color'];
};

export const resolveNewsletterPreviewColors = ({
    postTitleColorValue,
    ...input
}: ResolveNewsletterPreviewColorsInput) => {
    const colors = resolveSharedPreviewColors(input);

    const postTitleColor = isHexColor(postTitleColorValue)
        ? postTitleColorValue
        : postTitleColorValue === 'accent'
            ? input.accentColor
            : textColorForBackgroundColor(colors.headerBackgroundColor === 'transparent' ? colors.backgroundColor : colors.headerBackgroundColor).hex();

    return {
        ...colors,
        postTitleColor
    };
};

export const resolveAutomationPreviewColors = (input: ResolveSharedPreviewColorsInput) => {
    const colors = resolveSharedPreviewColors(input);

    return {
        ...colors,
        headingColor: colors.sectionTitleColor
    };
};

export const isBackgroundDark = (backgroundColor: string) => {
    const normalizedBackgroundColor = normalizeBackgroundColor(backgroundColor);
    return textColorForBackgroundColor(normalizedBackgroundColor).hex().toLowerCase() === '#ffffff';
};
