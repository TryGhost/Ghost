import KoenigComposerContext from '../../context/KoenigComposerContext';
import Picker from './EmojiPicker';
import Portal from './Portal';
import React from 'react';
import defaultData from '@emoji-mart/data';
import {useClickOutside} from '../../hooks/useClickOutside';

interface EmojiPickerPortalProps {
    onEmojiClick?: (emoji: {native: string}) => void;
    onClickOutside?: () => void;
    positionRef: React.RefObject<HTMLElement | null>;
    data?: unknown;
    autoFocus?: boolean;
    dynamicWidth?: boolean;
    emojiButtonRadius?: string;
    emojiButtonSize?: number;
    emojiSize?: number;
    icons?: 'auto' | 'outline' | 'solid';
    locale?: string;
    maxFrequentRows?: number;
    navPosition?: 'top' | 'bottom' | 'none';
    noCountryFlags?: boolean;
    noResultsEmoji?: string;
    perLine?: number;
    previewEmoji?: string | null;
    previewPosition?: 'top' | 'bottom' | 'none';
    searchPosition?: 'sticky' | 'static' | 'none';
    set?: 'native' | 'apple' | 'facebook' | 'google' | 'twitter';
    skin?: 1 | 2 | 3 | 4 | 5 | 6;
    skinTonePosition?: 'preview' | 'search' | 'none';
    [key: string]: unknown;
}

const EmojiPickerPortal = ({
    onEmojiClick,
    onClickOutside,
    positionRef,
    data = defaultData,
    autoFocus = true,
    dynamicWidth = false,
    emojiButtonRadius = '100%',
    emojiButtonSize = 36,
    emojiSize = 24,
    icons = 'outline',
    locale = 'en',
    maxFrequentRows = 1,
    navPosition = 'bottom',
    noCountryFlags = false,
    noResultsEmoji = 'cry',
    perLine = 9,
    previewEmoji = null,
    previewPosition = 'none',
    searchPosition = 'sticky',
    set = 'native',
    skin = 1,
    skinTonePosition = 'preview',
    ...props
}: EmojiPickerPortalProps) => {
    const [position, setPosition] = React.useState<{x: number; y: number; isInDialog: boolean} | null>(null);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const {darkMode} = React.useContext(KoenigComposerContext);

    // the picker renders in a portal so the trigger button sits outside of it,
    // include it here to avoid closing and immediately re-opening on trigger click
    const clickOutsideRefs = React.useMemo(() => [pickerRef, positionRef], [positionRef]);

    const handleClickOutside = React.useCallback(() => onClickOutside?.(), [onClickOutside]);
    useClickOutside(!!onClickOutside, clickOutsideRefs, handleClickOutside);

    const shiftPixels = 35; // how many pixels we want to move it up when it's at the bottom of the screen
    const handleScroll = React.useCallback(() => {
        if (positionRef.current) {
            const rect = positionRef.current.getBoundingClientRect();
            const scrollX = document.documentElement.scrollLeft;
            const scrollY = document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const pickerHeight = 352; // Approximate height of the emoji picker, adjust if needed

            let adjustedTop = rect.top + scrollY;

            if (adjustedTop + pickerHeight > windowHeight) {
                adjustedTop = rect.top - pickerHeight - shiftPixels + scrollY;
            }

            setPosition({
                x: (rect.left + scrollX) / 1.5,
                y: adjustedTop,
                // Raise the picker for editors inside modals, like some email editors.
                isInDialog: !!positionRef.current.closest('[role="dialog"], #modal-backdrop')
            });
        }
    }, [positionRef]);

    React.useEffect(() => {
        handleScroll();
        document.addEventListener('scroll', handleScroll, true); // Use true for capture phase
        return () => {
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [handleScroll]);

    if (!position) {
        return null;
    }
    const {x, y, isInDialog} = position;
    const pickerLayer = isInDialog ? 'z-[10000]' : 'z-20';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const style: React.CSSProperties = {
        left: x,
        top: y,
        position: 'fixed'
    };

    // https://github.com/missive/emoji-mart#options--props
    const defaultPickerProps = {
        theme: darkMode ? 'dark' : 'light',
        autoFocus,
        dynamicWidth,
        emojiButtonRadius,
        emojiButtonSize,
        emojiSize,
        icons,
        locale,
        maxFrequentRows,
        navPosition,
        noCountryFlags,
        noResultsEmoji,
        perLine,
        previewEmoji,
        previewPosition,
        searchPosition,
        set,
        skin,
        skinTonePosition
    };

    const pickerProps = {...defaultPickerProps, ...props};

    return (
        <Portal>
            <div ref={pickerRef} className={`${pickerLayer} mr-9 mt-10 rounded-md bg-white`} data-testid="emoji-picker-container" style={style} onClick={handleClick}>
                <div className=''>
                    <Picker // https://github.com/missive/emoji-mart#-picker
                        data={data}
                        onEmojiSelect={onEmojiClick}
                        {...pickerProps}
                    />
                </div>
            </div>
        </Portal>
    );
};

export default EmojiPickerPortal;
