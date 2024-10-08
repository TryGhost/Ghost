export type Font = 'EB Garamond' | 'Inter' | 'JetBrains Mono' | 'Libre Baskerville' | 'Lora' | 'Mulish' | 'Open Sans' | 'Poppins' | 'PT Serif' | 'Raleway';

export function generateCustomFontCss(font: Font) {
    const importStrings = {
        'EB Garamond': '@import url(https://fonts.bunny.net/css?family=eb-garamond:400);',
        Inter: '@import url(https://fonts.bunny.net/css?family=inter:400);',
        'JetBrains Mono': '@import url(https://fonts.bunny.net/css?family=jetbrains-mono:400);',
        'Libre Baskerville': '@import url(https://fonts.bunny.net/css?family=libre-baskerville:400);',
        Lora: '@import url(https://fonts.bunny.net/css?family=lora:400);',
        Mulish: '@import url(https://fonts.bunny.net/css?family=mulish:400);',
        'Open Sans': '@import url(https://fonts.bunny.net/css?family=open-sans:400);',
        Poppins: '@import url(https://fonts.bunny.net/css?family=poppins:400);',
        'PT Serif': '@import url(https://fonts.bunny.net/css?family=pt-serif:400);',
        Raleway: '@import url(https://fonts.bunny.net/css?family=raleway:400);'
    };

    return `
        <style>
            ${importStrings[font]}

            p {
                font-family: ${font};
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
