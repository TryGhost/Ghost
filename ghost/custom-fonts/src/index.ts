export type BodyFont = 'Fira Mono' | 'Fira Sans' | 'IBM Plex Serif' | 'Inter' | 'JetBrains Mono' | 'Lora' | 'Manrope' | 'Merriweather' | 'Nunito' | 'Noto Sans' | 'Noto Serif' | 'Poppins' | 'Roboto' | 'Space Mono';
export type HeadingFont = 'Cardo' | 'Chakra Petch' | 'Old Standard TT' | 'Prata' | 'Rufina' | 'Space Grotesk' | 'Tenor Sans' | BodyFont;
export type CustomFonts = {heading: HeadingFont[], body: BodyFont[]};

export type FontSelection = {
    heading?: HeadingFont,
    body?: BodyFont
};

export const CUSTOM_FONTS: CustomFonts = {
    heading: [
        'Cardo',
        'Chakra Petch',
        'Fira Mono',
        'Fira Sans',
        'IBM Plex Serif',
        'Inter',
        'JetBrains Mono',
        'Lora',
        'Manrope',
        'Merriweather',
        'Noto Sans',
        'Noto Serif',
        'Nunito',
        'Old Standard TT',
        'Poppins',
        'Prata',
        'Roboto',
        'Rufina',
        'Space Grotesk',
        'Space Mono',
        'Tenor Sans'
    ],
    body: [
        'Fira Mono',
        'Fira Sans',
        'IBM Plex Serif',
        'Inter',
        'JetBrains Mono',
        'Lora',
        'Manrope',
        'Merriweather',
        'Noto Sans',
        'Noto Serif',
        'Nunito',
        'Poppins',
        'Roboto',
        'Space Mono'
    ]
};

const classFontNames = {
    Cardo: 'cardo',
    Manrope: 'manrope',
    Merriweather: 'merriweather',
    Nunito: 'nunito',
    'Old Standard TT': 'old-standard-tt',
    Prata: 'prata',
    Roboto: 'roboto',
    Rufina: 'rufina',
    'Tenor Sans': 'tenor-sans',
    'Space Grotesk': 'space-grotesk',
    'Chakra Petch': 'chakra-petch',
    'Noto Sans': 'noto-sans',
    Poppins: 'poppins',
    'Fira Sans': 'fira-sans',
    Inter: 'inter',
    'Noto Serif': 'noto-serif',
    Lora: 'lora',
    'IBM Plex Serif': 'ibm-plex-serif',
    'Space Mono': 'space-mono',
    'Fira Mono': 'fira-mono',
    'JetBrains Mono': 'jetbrains-mono'
};

export function generateCustomFontCss(fonts: FontSelection) {
    let fontImports: string = '';
    let fontCSS: string = '';

    const importStrings = {
        Cardo: {
            url: '@import url(https://fonts.bunny.net/css?family=cardo:400,700)'
        },
        Manrope: {
            url: '@import url(https://fonts.bunny.net/css?family=manrope:300,500,700)'
        },
        Merriweather: {
            url: '@import url(https://fonts.bunny.net/css?family=merriweather:300,700)'
        },
        Nunito: {
            url: '@import url(https://fonts.bunny.net/css?family=nunito:400,600,700)'
        },
        'Old Standard TT': {
            url: '@import url(https://fonts.bunny.net/css?family=old-standard-tt:400,700)'
        },
        Prata: {
            url: '@import url(https://fonts.bunny.net/css?family=prata:400)'
        },
        Roboto: {
            url: '@import url(https://fonts.bunny.net/css?family=roboto:400,500,700)'
        },
        Rufina: {
            url: '@import url(https://fonts.bunny.net/css?family=rufina:400,500,700)'
        },
        'Tenor Sans': {
            url: '@import url(https://fonts.bunny.net/css?family=tenor-sans:400)'
        },
        'Space Grotesk': {
            url: '@import url(https://fonts.bunny.net/css?family=space-grotesk:700)'
        },
        'Chakra Petch': {
            url: '@import url(https://fonts.bunny.net/css?family=chakra-petch:400)'
        },
        'Noto Sans': {
            url: '@import url(https://fonts.bunny.net/css?family=noto-sans:400,700)'
        },
        Poppins: {
            url: '@import url(https://fonts.bunny.net/css?family=poppins:400,500,600)'
        },
        'Fira Sans': {
            url: '@import url(https://fonts.bunny.net/css?family=fira-sans:400,500,600)'
        },
        Inter: {
            url: '@import url(https://fonts.bunny.net/css?family=inter:400,500,600)'
        },
        'Noto Serif': {
            url: '@import url(https://fonts.bunny.net/css?family=noto-serif:400,700)'
        },
        Lora: {
            url: '@import url(https://fonts.bunny.net/css?family=lora:400,700)'
        },
        'IBM Plex Serif': {
            url: '@import url(https://fonts.bunny.net/css?family=ibm-plex-serif:400,500,600)'
        },
        'Space Mono': {
            url: '@import url(https://fonts.bunny.net/css?family=space-mono:400,700)'
        },
        'Fira Mono': {
            url: '@import url(https://fonts.bunny.net/css?family=fira-mono:400,700)'
        },
        'JetBrains Mono': {
            url: '@import url(https://fonts.bunny.net/css?family=jetbrains-mono:400,700)'
        }
    };

    if (fonts?.heading && fonts?.body && fonts?.heading === fonts?.body) {
        fontImports = `${importStrings[fonts?.heading]?.url};`;
    } else {
        fontImports = '';

        if (fonts?.heading) {
            fontImports += `${importStrings[fonts?.heading]?.url};`;
        }

        if (fonts?.body) {
            fontImports += `${importStrings[fonts?.body]?.url};`;
        }
    }

    if (fonts?.body || fonts?.heading) {
        fontCSS = ':root {';

        if (fonts?.heading) {
            fontCSS += `--gh-font-heading: ${fonts.heading};`;
        }

        if (fonts?.body) {
            fontCSS += `--gh-font-body: ${fonts.body};`;
        }

        fontCSS += '}';
    }

    return `<style>${fontImports}${fontCSS}</style>`;
}

export function generateCustomFontBodyClass(fonts: FontSelection) {
    let bodyClass = '';

    if (fonts?.heading) {
        bodyClass += getCustomFontClassName({font: fonts.heading, heading: true});
        if (fonts?.body) {
            bodyClass += ' ';
        }
    }

    if (fonts?.body) {
        bodyClass += getCustomFontClassName({font: fonts.body, heading: false});
    }

    return bodyClass;
}

export function getCSSFriendlyFontClassName(font: string) {
    return classFontNames[font as keyof typeof classFontNames] || '';
}

export function getCustomFontClassName({font, heading}: {font: string, heading: boolean}) {
    const cssFriendlyFontClassName = getCSSFriendlyFontClassName(font);

    if (!cssFriendlyFontClassName) {
        return '';
    }

    return `gh-font-${heading ? 'heading' : 'body'}-${cssFriendlyFontClassName}`;
}

export function getCustomFonts(): CustomFonts {
    return CUSTOM_FONTS;
}

export function isValidCustomFont(font: string): font is BodyFont {
    return CUSTOM_FONTS.body.includes(font as BodyFont);
}

export function isValidCustomHeadingFont(font: string): font is HeadingFont {
    return CUSTOM_FONTS.heading.includes(font as HeadingFont);
}
