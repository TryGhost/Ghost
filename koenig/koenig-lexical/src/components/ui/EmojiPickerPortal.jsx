import KoenigComposerContext from '../../context/KoenigComposerContext';
import Picker from './EmojiPicker';
import Portal from './Portal';
import PropTypes from 'prop-types';
import React from 'react';
import defaultData from '@emoji-mart/data';

const EmojiPickerPortal = ({onEmojiClick, positionRef, data = defaultData, ...props}) => {
    const [position, setPosition] = React.useState(null);
    const {darkMode} = React.useContext(KoenigComposerContext);

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

            setPosition({x: (rect.left + scrollX) / 1.5, y: adjustedTop});
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
    const {x, y} = position;

    const handleClick = (e) => {
        e.stopPropagation();
    };

    const style = {
        left: x,
        top: y,
        position: 'fixed'
    };

    // https://github.com/missive/emoji-mart#options--props
    const defaultProps = {
        autoFocus: true,
        icons: 'outline',
        maxFrequentRows: 1,
        navPosition: 'bottom',
        noResultsEmoji: 'cry',
        previewPosition: 'none',
        theme: darkMode ? 'dark' : 'light'
    };

    const mergedProps = {...defaultProps, ...props};

    return (
        <Portal>
            <div className='z-20 mr-9 mt-10 rounded-md bg-white' data-testid="emoji-picker-container" style={style} onClick={handleClick}>
                <div className=''>
                    <Picker // https://github.com/missive/emoji-mart#-picker
                        data={data}
                        onEmojiSelect={onEmojiClick}
                        {...mergedProps}
                    />
                </div>
            </div>
        </Portal>
    );
};

export default EmojiPickerPortal;

EmojiPickerPortal.propTypes = {
    onEmojiClick: PropTypes.func.isRequired,
    positionRef: PropTypes.object,
    data: PropTypes.array,
    autoFocus: PropTypes.bool,
    dynamicWidth: PropTypes.bool,
    emojiButtonColors: PropTypes.arrayOf(PropTypes.string),
    emojiButtonRadius: PropTypes.string,
    emojiButtonSize: PropTypes.number,
    emojiSize: PropTypes.number,
    emojiVersion: PropTypes.oneOf([1, 2, 3, 4, 5, 11, 12, 12.1, 13, 13.1, 14]),
    exceptEmojis: PropTypes.arrayOf(PropTypes.string),
    icons: PropTypes.oneOf(['auto', 'outline', 'solid']),
    locale: PropTypes.oneOf(['en','ar','be','cs','de','es','fa','fi','fr','hi','it','ja','kr','nl','pl','pt','ru','sa','tr','uk','vi','zh']),
    maxFrequentRows: PropTypes.number,
    navPosition: PropTypes.oneOf(['top', 'bottom', 'none']),
    noCountryFlags: PropTypes.bool,
    noResultsEmoji: PropTypes.string,
    perLine: PropTypes.number,
    previewEmoji: PropTypes.string,
    previewPosition: PropTypes.oneOf(['top', 'bottom', 'none']),
    searchPosition: PropTypes.oneOf(['sticky', 'static', 'none']),
    set: PropTypes.oneOf(['native', 'apple', 'facebook', 'google', 'twitter']),
    setInstanceRef: PropTypes.func,
    skin: PropTypes.oneOf([1, 2, 3, 4, 5, 6]),
    skinTonePosition: PropTypes.oneOf(['preview', 'search', 'none']),
    theme: PropTypes.oneOf(['auto', 'light', 'dark'])
};

EmojiPickerPortal.defaultProps = {
    autoFocus: true,
    dynamicWidth: false,
    emojiButtonRadius: '100%',
    emojiButtonSize: 36,
    emojiSize: 24,
    icons: 'outline',
    locale: 'en',
    maxFrequentRows: 1,
    navPosition: 'bottom',
    noCountryFlags: false,
    noResultsEmoji: 'cry',
    perLine: 9,
    previewEmoji: null,
    previewPosition: 'none',
    searchPosition: 'sticky',
    set: 'native',
    skin: 1,
    skinTonePosition: 'preview',
    theme: 'light'
};
