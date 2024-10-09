export type Font = 'Space Grotesk' | 'Bebas Neue' | 'Playfair Display' | 'Chakra Petch' | 'Noto Sans' | 'Poppins' | 'Fira Sans' | 'Inter' | 'Noto Serif' | 'Lora' | 'IBM Plex Serif' | 'EB Garamond' | 'Space Mono' | 'Fira Mono' | 'JetBrains Mono';
export type FontSelection = {
    heading: Font,
    body: Font
};

export function generateCustomFontCss(fonts: FontSelection) {
    const importStrings = {
        'Space Grotesk': {
            url: '@import url(https://fonts.bunny.net/css?family=space-grotesk:700)'
        },
        'Bebas Neue': {
            url: '@import url(https://fonts.bunny.net/css?family=bebas-neue:400)'
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
            url: '@import url(https://fonts.bunny.net/css?family=poppins:400,700)'
        },
        'Fira Sans': {
            url: '@import url(https://fonts.bunny.net/css?family=fira-sans:400,700)'
        },
        Inter: {
            url: '@import url(https://fonts.bunny.net/css?family=inter:400,700)'
        },
        'Noto Serif': {
            url: '@import url(https://fonts.bunny.net/css?family=noto-serif:400,700)'
        },
        Lora: {
            url: '@import url(https://fonts.bunny.net/css?family=lora:400,700)'
        },
        'IBM Plex Serif': {
            url: '@import url(https://fonts.bunny.net/css?family=ibm-plex-serif:400,700)'
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

    let fontImports = '';

    if (fonts.heading === fonts.body) {
        fontImports = `${importStrings[fonts.heading].url}`;
    } else {
        fontImports = `${importStrings[fonts.heading].url}; ${importStrings[fonts.body].url}`;
    }

    return `
        <style>
            ${fontImports};

            .is-title, .gh-content [id] {
                font-family: ${fonts.heading} !important;
            }

            .is-body {
                font-family: ${fonts.body} !important;
            }
        </style>
    `;
}

// Main module file
export const CUSTOM_FONTS: Font[] = [
    'Space Grotesk',
    'Bebas Neue',
    'Playfair Display',
    'Chakra Petch',
    'Noto Sans',
    'Poppins',
    'Fira Sans',
    'Inter',
    'Noto Serif',
    'Lora',
    'IBM Plex Serif',
    'EB Garamond',
    'Space Mono',
    'Fira Mono',
    'JetBrains Mono'
];

export function getCustomFonts(): Font[] {
    return CUSTOM_FONTS;
}

export function isValidCustomFont(font: string): font is Font {
    return CUSTOM_FONTS.includes(font as Font);
}
