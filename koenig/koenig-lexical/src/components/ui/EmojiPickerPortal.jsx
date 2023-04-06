import Picker from '@emoji-mart/react';
import Portal from './Portal';
import React from 'react';
import data from '@emoji-mart/data';
const EmojiPickerPortal = ({onEmojiClick, buttonRef}) => {
    const [position, setPosition] = React.useState(null);

    const handleScroll = React.useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const scrollX = document.documentElement.scrollLeft;
            const scrollY = document.documentElement.scrollTop;
            setPosition({x: (rect.left + scrollX) / 1.5, y: rect.top + scrollY});
        }
    }, [buttonRef]);
    
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
    return (
        <Portal>
            <div className='z-10 mr-9 mt-10 rounded-md bg-white' data-testid="emoji-picker-container" style={style} onClick={handleClick}>
                <div className=''>
                    <Picker
                        autoFocus='true'
                        data={data}
                        icons='outline'
                        maxFrequentRows='1'
                        navPosition='bottom'
                        noResultsEmoji='cry'
                        previewPosition='none'
                        onEmojiSelect={onEmojiClick}
                    />
                </div>
            </div>
        </Portal>
    );
};

export default EmojiPickerPortal;
