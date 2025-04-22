import React, {useEffect, useState} from 'react';
import {Button, LucideIcon, Popover, PopoverContent, PopoverTrigger} from '@tryghost/shade';
import {Icon} from '@tryghost/admin-x-design-system';

export const FONT_SIZES = ['1.5rem', '1.6rem', '1.7rem', '1.8rem', '2rem'] as const;
export type FontSize = typeof FONT_SIZES[number];

export const STORAGE_KEYS = {
    BACKGROUND_COLOR: 'ghost-ap-background-color',
    FONT_SIZE: 'ghost-ap-font-size',
    FONT_FAMILY: 'ghost-ap-font-family',
    FONT_STYLE: 'ghost-ap-font-style'
} as const;

export const COLOR_OPTIONS = {
    SYSTEM: {
        id: 'system',
        color: '#fff',
        background: 'bg-white dark:bg-black',
        button: 'bg-white dark:bg-black',
        border: 'border-black/[8%] dark:border-gray-950'
    },
    SEPIA: {
        id: 'sepia',
        color: '#FCF8F1',
        background: 'bg-[#FCF8F1]',
        button: 'bg-[#FCF8F1] hover:bg-black/[3%] text-black hover:text-black',
        border: 'border-black/[8%]'
    },
    LIGHT: {
        id: 'light',
        color: '#fff',
        background: 'bg-white',
        button: 'hover:bg-black/[3%] text-black hover:text-black',
        border: 'border-black/[8%] dark:border-gray-950'
    },
    DARK: {
        id: 'dark',
        color: '#15171a',
        background: 'bg-black',
        button: 'text-white dark:bg-black dark:hover:bg-gray-900',
        border: 'border-black/[8%] dark:border-gray-950'
    }
} as const;

export type ColorOption = keyof typeof COLOR_OPTIONS;
export type FontStyle = 'sans' | 'serif';

interface CustomizerProps {
    backgroundColor: ColorOption;
    currentFontSizeIndex: number;
    fontStyle: FontStyle;
    onColorChange: (color: ColorOption) => void;
    onFontStyleChange: (style: FontStyle) => void;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
    onResetFontSize: () => void;
    onOpenChange?: (open: boolean) => void;
}

export const useCustomizerSettings = () => {
    const [backgroundColor, setBackgroundColor] = useState<ColorOption>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.BACKGROUND_COLOR);
        return (saved?.toUpperCase() as ColorOption) || 'SYSTEM';
    });

    const [currentFontSizeIndex, setCurrentFontSizeIndex] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
        return saved ? parseInt(saved) : 1;
    });

    const [fontStyle, setFontStyle] = useState<FontStyle>(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.FONT_STYLE);
        return (saved || 'sans') as FontStyle;
    });

    const handleColorChange = (color: ColorOption) => {
        setBackgroundColor(color);
        localStorage.setItem(STORAGE_KEYS.BACKGROUND_COLOR, COLOR_OPTIONS[color].id);
    };

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.FONT_SIZE, currentFontSizeIndex.toString());
    }, [currentFontSizeIndex]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.FONT_STYLE, fontStyle);
    }, [fontStyle]);

    const increaseFontSize = () => {
        setCurrentFontSizeIndex(prevIndex => Math.min(prevIndex + 1, FONT_SIZES.length - 1));
    };

    const decreaseFontSize = () => {
        setCurrentFontSizeIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const resetFontSize = () => setCurrentFontSizeIndex(1);

    return {
        backgroundColor,
        currentFontSizeIndex,
        fontStyle,
        handleColorChange,
        setFontStyle,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        fontSize: FONT_SIZES[currentFontSizeIndex]
    };
};

const Customizer: React.FC<CustomizerProps> = ({
    backgroundColor,
    currentFontSizeIndex,
    fontStyle,
    onColorChange,
    onFontStyleChange,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onResetFontSize,
    onOpenChange
}) => {
    const isActiveColor = (color: ColorOption) => backgroundColor === color;
    const isActiveFont = (font: FontStyle) => fontStyle === font;

    return (
        <CustomizerView
            backgroundColor={backgroundColor}
            currentFontSizeIndex={currentFontSizeIndex}
            fontStyle={fontStyle}
            isActiveColor={isActiveColor}
            isActiveFont={isActiveFont}
            onColorChange={onColorChange}
            onDecreaseFontSize={onDecreaseFontSize}
            onFontStyleChange={onFontStyleChange}
            onIncreaseFontSize={onIncreaseFontSize}
            onOpenChange={onOpenChange}
            onResetFontSize={onResetFontSize}
        />
    );
};

interface CustomizerViewProps extends CustomizerProps {
    isActiveColor: (color: ColorOption) => boolean;
    isActiveFont: (font: FontStyle) => boolean;
    currentFontSizeIndex: number;
}

const CustomizerView: React.FC<CustomizerViewProps> = ({
    backgroundColor,
    isActiveColor,
    isActiveFont,
    onColorChange,
    onFontStyleChange,
    currentFontSizeIndex,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onResetFontSize,
    onOpenChange
}) => (
    <Popover modal={false} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
            <Button className={`size-9 rounded-full ${COLOR_OPTIONS[backgroundColor].button}`} variant='ghost'>
                <Icon name='typography' />
            </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-[224px]' onCloseAutoFocus={e => e.preventDefault()} onOpenAutoFocus={e => e.preventDefault()}>
            <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between gap-[6px]'>
                    <Button
                        className={`h-7 flex-1 rounded-[6px] bg-gray-200 p-0 text-[1.1rem] text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900 [&_svg]:size-[14px] ${isActiveColor('SYSTEM') ? 'outline outline-2 outline-green' : ''}`}
                        variant="secondary"
                        onClick={() => onColorChange('SYSTEM')}
                    >
                        Auto
                    </Button>
                    <Button
                        className={`h-7 flex-1 rounded-[6px] bg-[#ece6d9] p-0 hover:bg-[#ece6d9] ${isActiveColor('SEPIA') ? 'outline outline-2 outline-green' : 'border border-[#ece6d9]'}`}
                        onClick={() => onColorChange('SEPIA')}
                    />
                    <Button
                        className={`h-7 flex-1 rounded-[6px] bg-white p-0 hover:bg-white ${isActiveColor('LIGHT') ? 'outline outline-2 outline-green' : 'border border-gray-200'}`}
                        onClick={() => onColorChange('LIGHT')}
                    />
                    <Button
                        className={`h-7 flex-1 rounded-[6px] bg-black p-0 hover:bg-black dark:border dark:border-gray-925 ${isActiveColor('DARK') ? 'outline outline-2 outline-green' : ''}`}
                        onClick={() => onColorChange('DARK')}
                    />
                </div>
                <div className='flex gap-2'>
                    <Button
                        className={`flex h-auto w-full flex-col gap-1 rounded-[6px] bg-gray-200 text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900 ${isActiveFont('sans') && 'outline outline-2 outline-green'}`}
                        variant="secondary"
                        onClick={() => onFontStyleChange('sans')}
                    >
                        <span className='text-[2rem] font-bold leading-none'>Aa</span>
                        <span className='text-[1.1rem]'>System</span>
                    </Button>
                    <Button
                        className={`flex h-auto w-full flex-col gap-1 rounded-[6px] bg-gray-200 text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900 ${isActiveFont('serif') && 'outline outline-2 outline-green'}`}
                        variant="secondary"
                        onClick={() => onFontStyleChange('serif')}
                    >
                        <span className='pt-1 font-serif text-[2rem] font-bold leading-none'>Aa</span>
                        <span className='font-serif text-[1.2rem]'>Serif</span>
                    </Button>
                </div>
                <div className='flex gap-2'>
                    <Button
                        className='h-8 w-full rounded-[6px] bg-gray-200 text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900 [&_svg]:size-[14px]'
                        disabled={currentFontSizeIndex === 0}
                        variant="secondary"
                        onClick={onDecreaseFontSize}
                    >
                        <LucideIcon.Minus />
                    </Button>
                    <Button
                        className='h-8 w-full rounded-[6px] bg-gray-200 text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900'
                        variant="secondary"
                        onClick={onResetFontSize}
                    >
                        <span className='text-[1.6rem] font-bold'>Aa</span>
                    </Button>
                    <Button
                        className='h-8 w-full rounded-[6px] bg-gray-200 text-black hover:bg-gray-250 dark:bg-gray-925 dark:text-white dark:hover:bg-gray-900 [&_svg]:size-[14px]'
                        disabled={currentFontSizeIndex === FONT_SIZES.length - 1}
                        variant="secondary"
                        onClick={onIncreaseFontSize}
                    >
                        <LucideIcon.Plus />
                    </Button>
                </div>
            </div>
        </PopoverContent>
    </Popover>
);

export default Customizer;
