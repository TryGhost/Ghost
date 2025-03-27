export type BodyFontName =
  | 'Fira Mono'
  | 'Fira Sans'
  | 'IBM Plex Serif'
  | 'Inter'
  | 'JetBrains Mono'
  | 'Lora'
  | 'Manrope'
  | 'Merriweather'
  | 'Nunito'
  | 'Noto Sans'
  | 'Noto Serif'
  | 'Poppins'
  | 'Roboto'
  | 'Space Mono';

export type HeadingFontName =
  | 'Cardo'
  | 'Chakra Petch'
  | 'Old Standard TT'
  | 'Libre Baskerville'
  | 'Rufina'
  | 'Space Grotesk'
  | 'Tenor Sans'
  | BodyFontName;

export type Font<T extends string> = {
    name: T;
    creator: string;
};

export type HeadingFont = Font<HeadingFontName>;
export type BodyFont = Font<BodyFontName>;

export type CustomFonts = {
  heading: HeadingFont[];
  body: BodyFont[];
};

export type FontSelection = {
  heading?: HeadingFontName;
  body?: BodyFontName;
};

export const CUSTOM_FONTS: CustomFonts = {
    heading: [
        {name: 'Cardo', creator: 'David Perry'},
        {name: 'Chakra Petch', creator: 'Cadson Demak'},
        {name: 'Fira Mono', creator: 'Carrois Apostrophe'},
        {name: 'Fira Sans', creator: 'Carrois Apostrophe'},
        {name: 'IBM Plex Serif', creator: 'Mike Abbink'},
        {name: 'Inter', creator: 'Rasmus Andersson'},
        {name: 'JetBrains Mono', creator: 'JetBrains'},
        {name: 'Libre Baskerville', creator: 'Impallari Type'},
        {name: 'Lora', creator: 'Cyreal'},
        {name: 'Manrope', creator: 'Mikhail Sharanda'},
        {name: 'Merriweather', creator: 'Sorkin Type'},
        {name: 'Noto Sans', creator: 'Google'},
        {name: 'Noto Serif', creator: 'Google'},
        {name: 'Nunito', creator: 'Vernon Adams'},
        {name: 'Old Standard TT', creator: 'Alexey Kryukov'},
        {name: 'Poppins', creator: 'Indian Type Foundry'},
        {name: 'Roboto', creator: 'Christian Robertson'},
        {name: 'Rufina', creator: 'Martin Sommaruga'},
        {name: 'Space Grotesk', creator: 'Florian Karsten'},
        {name: 'Space Mono', creator: 'Colophon Foundry'},
        {name: 'Tenor Sans', creator: 'Denis Masharov'}
    ],
    body: [
        {name: 'Fira Mono', creator: 'Carrois Apostrophe'},
        {name: 'Fira Sans', creator: 'Carrois Apostrophe'},
        {name: 'IBM Plex Serif', creator: 'Mike Abbink'},
        {name: 'Inter', creator: 'Rasmus Andersson'},
        {name: 'JetBrains Mono', creator: 'JetBrains'},
        {name: 'Lora', creator: 'Cyreal'},
        {name: 'Manrope', creator: 'Mikhail Sharanda'},
        {name: 'Merriweather', creator: 'Sorkin Type'},
        {name: 'Noto Sans', creator: 'Google'},
        {name: 'Noto Serif', creator: 'Google'},
        {name: 'Nunito', creator: 'Vernon Adams'},
        {name: 'Poppins', creator: 'Indian Type Foundry'},
        {name: 'Roboto', creator: 'Christian Robertson'},
        {name: 'Space Mono', creator: 'Colophon Foundry'}
    ]
};

const classFontNames = {
    Cardo: 'cardo',
    Manrope: 'manrope',
    Merriweather: 'merriweather',
    Nunito: 'nunito',
    'Old Standard TT': 'old-standard-tt',
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
    'JetBrains Mono': 'jetbrains-mono',
    'Libre Baskerville': 'libre-baskerville'
};

export function generateCustomFontCss(fonts: FontSelection) {
    let fontImports: string = '';
    let fontCSS: string = '';

    const importStrings = {
        Cardo: {
            family: 'cardo:400,700'
        },
        Manrope: {
            family: 'manrope:300,500,700'
        },
        Merriweather: {
            family: 'merriweather:300,700'
        },
        Nunito: {
            family: 'nunito:400,600,700'
        },
        'Old Standard TT': {
            family: 'old-standard-tt:400,700'
        },
        Roboto: {
            family: 'roboto:400,500,700'
        },
        Rufina: {
            family: 'rufina:400,500,700'
        },
        'Tenor Sans': {
            family: 'tenor-sans:400'
        },
        'Space Grotesk': {
            family: 'space-grotesk:700'
        },
        'Chakra Petch': {
            family: 'chakra-petch:400'
        },
        'Noto Sans': {
            family: 'noto-sans:400,700'
        },
        Poppins: {
            family: 'poppins:400,500,600'
        },
        'Fira Sans': {
            family: 'fira-sans:400,500,600'
        },
        Inter: {
            family: 'inter:400,500,600'
        },
        'Noto Serif': {
            family: 'noto-serif:400,700'
        },
        Lora: {
            family: 'lora:400,700'
        },
        'IBM Plex Serif': {
            family: 'ibm-plex-serif:400,500,600'
        },
        'Space Mono': {
            family: 'space-mono:400,700'
        },
        'Fira Mono': {
            family: 'fira-mono:400,700'
        },
        'JetBrains Mono': {
            family: 'jetbrains-mono:400,700'
        },
        'Libre Baskerville': {
            family: 'libre-baskerville:700'
        }
    };

    if (fonts?.heading && fonts?.body && fonts?.heading === fonts?.body) {
        fontImports = `<link rel="stylesheet" href="https://fonts.bunny.net/css?family=${importStrings[fonts?.heading]?.family}">`;
    } else {
        fontImports = '';

        if (fonts?.heading && fonts?.body) {
            fontImports += `<link rel="stylesheet" href="https://fonts.bunny.net/css?family=${importStrings[fonts?.heading]?.family}|${importStrings[fonts?.body]?.family}">`;
        } else {
            if (fonts?.heading) {
                fontImports += `<link rel="stylesheet" href="https://fonts.bunny.net/css?family=${importStrings[fonts?.heading]?.family}">`;
            }

            if (fonts?.body) {
                fontImports += `<link rel="stylesheet" href="https://fonts.bunny.net/css?family=${importStrings[fonts?.body]?.family}">`;
            }
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

    return `<link rel="preconnect" href="https://fonts.bunny.net">${fontImports}<style>${fontCSS}</style>`;
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

export function isValidCustomFont(fontName: string): fontName is BodyFontName {
    return CUSTOM_FONTS.body.some(font => font.name === fontName);
}

export function isValidCustomHeadingFont(fontName: string): fontName is HeadingFontName {
    return CUSTOM_FONTS.heading.some(font => font.name === fontName);
}
