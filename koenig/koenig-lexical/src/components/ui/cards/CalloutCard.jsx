import EmojiPickerPortal from '../EmojiPickerPortal';
import KoenigCalloutEditor from '../../KoenigCalloutEditor';
import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import PropTypes from 'prop-types';
import React from 'react';
import {ColorPickerSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';

export const CALLOUT_COLORS = {
    grey: 'bg-grey/10 border-transparent',
    white: 'bg-transparent border-grey/30',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent'
};

export const calloutColorPicker = [
    {
        label: 'Grey',
        name: 'grey',
        colorClass: 'bg-grey/10 dark:border-white/10'
    },
    {
        label: 'White',
        name: 'white',
        colorClass: 'bg-transparent dark:border-white/10'
    },
    {
        label: 'Blue',
        name: 'blue',
        colorClass: 'bg-blue/10 dark:border-white/10'
    },
    {
        label: 'Green',
        name: 'green',
        colorClass: 'bg-green/10 dark:border-white/10'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        colorClass: 'bg-yellow/10 dark:border-white/10'
    },
    {
        label: 'Red',
        name: 'red',
        colorClass: 'bg-red/10 dark:border-white/10'
    },
    {
        label: 'Pink',
        name: 'pink',
        colorClass: 'bg-pink/10 dark:border-white/10'
    },
    {
        label: 'Purple',
        name: 'purple',
        colorClass: 'bg-purple/10 dark:border-white/10'
    },
    {
        label: 'Accent',
        name: 'accent',
        colorClass: 'bg-pink' //todo - this should be the theme colour
    }
];

export function CalloutCard({
    color,
    emoji,
    isEditing,
    setShowEmojiPicker,
    toggleEmoji,
    handleColorChange,
    changeEmoji,
    emojiValue,
    textEditor,
    textEditorInitialState,
    nodeKey,
    toggleEmojiPicker,
    showEmojiPicker
}) {
    const emojiButtonRef = React.useRef(null);
    const {darkMode} = React.useContext(KoenigComposerContext);

    React.useEffect(() => {
        if (!isEditing) {
            setShowEmojiPicker(false);
        }
    }, [isEditing, setShowEmojiPicker]);

    return (
        <>
            <div className={`flex rounded border px-7 py-5 ${CALLOUT_COLORS[color]} `} data-testid={`callout-bg-${color}`}>
                <div>
                    {emoji &&
                    <>
                        <button
                            ref={emojiButtonRef}
                            className={`mr-2 cursor-pointer rounded px-2 text-xl ${isEditing ? 'hover:bg-grey-500/20' : ''} ` }
                            data-testid="emoji-picker-button"
                            type="button"
                            onClick={toggleEmojiPicker}
                        >
                            {emojiValue}
                        </button>
                        {
                            isEditing && showEmojiPicker && (
                                <EmojiPickerPortal
                                    buttonRef={emojiButtonRef}
                                    togglePortal={toggleEmojiPicker}
                                    onEmojiClick={changeEmoji} />
                            )
                        }
                    </>}
                </div>
                <KoenigCalloutEditor
                    className="my-0 w-full whitespace-normal bg-transparent font-serif text-xl font-normal text-black dark:text-grey-300"
                    nodeKey={nodeKey}
                    placeholderText={'Callout text...'}
                    textEditor={textEditor}
                    textEditorInitialState={textEditorInitialState}
                />
            </div>
            {
                isEditing ? (
                    <SettingsPanel
                        darkMode={darkMode}
                    >
                        <ToggleSetting
                            dataTestID='emoji-toggle'
                            isChecked={emoji}
                            label='Emoji'
                            onChange={toggleEmoji}
                        />
                        <ColorPickerSetting
                            buttons={calloutColorPicker}
                            dataTestID='callout-color-picker'
                            label='Background color'
                            layout='stacked'
                            selectedName={color}
                            onClick={handleColorChange}
                        />
                    </SettingsPanel>
                ) : (
                    <div className="absolute top-0 z-10 m-0 h-full w-full cursor-default p-0"></div>
                )
            }
        </>
    );
}

CalloutCard.propTypes = {
    color: PropTypes.oneOf(['grey', 'white', 'blue', 'green', 'yellow', 'red', 'pink', 'purple', 'accent']),
    text: PropTypes.string,
    placeholder: PropTypes.string,
    isEditing: PropTypes.bool,
    updateText: PropTypes.func,
    emoji: PropTypes.bool,
    emojiValue: PropTypes.string
};

CalloutCard.defaultProps = {
    color: 'green',
    emojiValue: '💡'
};
