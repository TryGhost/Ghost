export type Font = 'Space Grotesk' | 'Bebas Neue' | 'Playfair Display' | 'Chakra Petch' | 'Noto Sans' | 'Poppins' | 'Fira Sans' | 'Inter' | 'Noto Serif' | 'Lora' | 'IBM Plex Serif' | 'EB Garamond' | 'Space Mono' | 'Fira Mono' | 'JetBrains Mono';

export function generateCustomFontCss(font: Font) {
    const importStrings = {
        'Space Grotesk': '@import url(https://fonts.bunny.net/css?family=space-grotesk:700)',
        'Bebas Neue': '@import url(https://fonts.bunny.net/css?family=bebas-neue:400)',
        'Playfair Display': '@import url(https://fonts.bunny.net/css?family=playfair-display:400)',
        'Chakra Petch': '@import url(https://fonts.bunny.net/css?family=chakra-petch:400)',
        'Noto Sans': '@import url(https://fonts.bunny.net/css?family=noto-sans:400,700)',
        Poppins: '@import url(https://fonts.bunny.net/css?family=poppins:400,700)',
        'Fira Sans': '@import url(https://fonts.bunny.net/css?family=fira-sans:400,700)',
        Inter: '@import url(https://fonts.bunny.net/css?family=inter:400,700)',
        'Noto Serif': '@import url(https://fonts.bunny.net/css?family=noto-serif:400,700)',
        Lora: '@import url(https://fonts.bunny.net/css?family=lora:400,700)',
        'IBM Plex Serif': '@import url(https://fonts.bunny.net/css?family=ibm-plex-serif:400,700)',
        'EB Garamond': '@import url(https://fonts.bunny.net/css?family=eb-garamond:400,700)',
        'Space Mono': '@import url(https://fonts.bunny.net/css?family=space-mono:400,700)',
        'Fira Mono': '@import url(https://fonts.bunny.net/css?family=fira-mono:400,700)',
        'JetBrains Mono': '@import url(https://fonts.bunny.net/css?family=jetbrains-mono:400,700)'
    };

    return `
        <style>
            ${importStrings[font]};

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
