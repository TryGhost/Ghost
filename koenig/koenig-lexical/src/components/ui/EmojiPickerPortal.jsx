import EmojiPicker from 'emoji-picker-react';
import Portal from './Portal';
import React from 'react';

const EmojiPickerPortal = ({onEmojiClick, buttonRef}) => {
    const [position, setPosition] = React.useState(null);

    React.useEffect(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({x: rect.left / 1.5, y: rect.bottom});
        } else {
            setPosition(null);
        }
    }, [buttonRef]);
  
    if (!position) {
        return null;
    }
  
    const {x, y} = position;

    const handleClick = (e) => {
        e.stopPropagation();
    };
    return (
        <Portal>
            <div className='fixed z-10 mr-9 mt-3 rounded-md bg-white' data-testid="emoji-picker-container" style={{left: x, top: y}} onClick={handleClick}>
                <div className='overflow-y-scroll rounded bg-white p-4 shadow-lg'>
                    <EmojiPicker 
                        onEmojiClick={onEmojiClick} 
                    />
                </div>
            </div>
        </Portal>
    );
};

export default EmojiPickerPortal;
