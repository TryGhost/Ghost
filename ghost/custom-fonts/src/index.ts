export type BodyFont = 'Noto Sans' | 'Poppins' | 'Fira Sans' | 'Inter' | 'Noto Serif' | 'Lora' | 'IBM Plex Serif' | 'EB Garamond' | 'Space Mono' | 'Fira Mono' | 'JetBrains Mono';
export type HeadingFont = 'Space Grotesk' | 'Playfair Display' | 'Chakra Petch' | BodyFont;
export type CustomFonts = {heading: HeadingFont[], body: BodyFont[]};

export type FontSelection = {
    heading?: HeadingFont,
    body?: BodyFont
};

export function generateCustomFontCss(fonts: FontSelection) {
    let fontImports: string = '';
    let fontCSS: string = '';

    const importStrings = {
        'Space Grotesk': {
            url: '@import url(https://fonts.bunny.net/css?family=space-grotesk:700)'
        },
        'Playfair Display': {
            url: '@import url(https://fonts.bunny.net/css?family=playfair-display:400)'
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
        'EB Garamond': {
            url: '@import url(https://fonts.bunny.net/css?family=eb-garamond:400,700)'
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
    const classFontNames = {
        'Space Grotesk': 'space-grotesk',
        'Playfair Display': 'playfair-display',
        'Chakra Petch': 'chakra-petch',
        'Noto Sans': 'noto-sans',
        Poppins: 'poppins',
        'Fira Sans': 'fira-sans',
        Inter: 'inter',
        'Noto Serif': 'noto-serif',
        Lora: 'lora',
        'IBM Plex Serif': 'ibm-plex-serif',
        'EB Garamond': 'eb-garamond',
        'Space Mono': 'space-mono',
        'Fira Mono': 'fira-mono',
        'JetBrains Mono': 'jetbrains-mono'
    };

    let bodyClass = '';

    if (fonts?.heading) {
        bodyClass += `gh-font-heading-${classFontNames[fonts.heading]}`;
    }

    if (fonts?.body) {
        bodyClass += `gh-font-body-${classFontNames[fonts.body]}`;
    }

    return bodyClass;
}

export const CUSTOM_FONTS: CustomFonts = {
    heading: [
        'Chakra Petch',
        'EB Garamond',
        'Fira Mono',
        'Fira Sans',
        'IBM Plex Serif',
        'Inter',
        'JetBrains Mono',
        'Lora',
        'Noto Sans',
        'Noto Serif',
        'Playfair Display',
        'Poppins',
        'Space Grotesk',
        'Space Mono'
    ],
    body: [
        'EB Garamond',
        'Fira Mono',
        'Fira Sans',
        'IBM Plex Serif',
        'Inter',
        'JetBrains Mono',
        'Lora',
        'Noto Sans',
        'Noto Serif',
        'Poppins',
        'Space Mono'
    ]
};

export function getCustomFonts(): CustomFonts {
    return CUSTOM_FONTS;
}

export function isValidCustomFont(font: string): font is BodyFont {
    return CUSTOM_FONTS.body.includes(font as BodyFont);
}

export function isValidCustomHeadingFont(font: string): font is HeadingFont {
    return CUSTOM_FONTS.heading.includes(font as HeadingFont);
}
