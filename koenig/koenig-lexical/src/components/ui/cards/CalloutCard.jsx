import EmojiPickerPortal from '../EmojiPickerPortal';
import KoenigComposerContext from '../../../context/KoenigComposerContext.jsx';
import KoenigNestedEditor from '../../KoenigNestedEditor';
import PropTypes from 'prop-types';
import React from 'react';
import {ColorOptionSetting, SettingsPanel, ToggleSetting} from '../SettingsPanel';
import {ReadOnlyOverlay} from '../ReadOnlyOverlay';

export const CALLOUT_COLORS = {
    white: 'bg-transparent border-grey/30',
    grey: 'bg-grey/10 border-transparent',
    blue: 'bg-blue/10 border-transparent',
    green: 'bg-green/10 border-transparent',
    yellow: 'bg-yellow/10 border-transparent',
    red: 'bg-red/10 border-transparent',
    pink: 'bg-pink/10 border-transparent',
    purple: 'bg-purple/10 border-transparent',
    accent: 'bg-accent border-transparent'
};

const TEXT_BLACK = 'text-black dark:text-grey-300 caret-black dark:caret-grey-300';
const TEXT_WHITE = 'text-white caret-white';

export const CALLOUT_TEXT_COLORS = {
    white: TEXT_BLACK,
    grey: TEXT_BLACK,
    blue: TEXT_BLACK,
    green: TEXT_BLACK,
    yellow: TEXT_BLACK,
    red: TEXT_BLACK,
    pink: TEXT_BLACK,
    purple: TEXT_BLACK,
    // .kg-callout-accent makes sure links are not in accent color anymore
    accent: TEXT_WHITE + ' kg-callout-accent'
};

export const calloutColorPicker = [
    {
        label: 'White',
        name: 'white',
        color: 'bg-transparent border-black/15 dark:border-white/10'
    },
    {
        label: 'Grey',
        name: 'grey',
        color: 'bg-grey/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Blue',
        name: 'blue',
        color: 'bg-blue/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Green',
        name: 'green',
        color: 'bg-green/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Yellow',
        name: 'yellow',
        color: 'bg-yellow/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Red',
        name: 'red',
        color: 'bg-red/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Pink',
        name: 'pink',
        color: 'bg-pink/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Purple',
        name: 'purple',
        color: 'bg-purple/15 border-black/[0.08] dark:border-white/10'
    },
    {
        label: 'Accent',
        name: 'accent',
        color: 'bg-accent border-black/[0.08] dark:border-white/10'
    }
];

export function CalloutCard({
    color,
    isEditing,
    setShowEmojiPicker,
    toggleEmoji,
    hasEmoji,
    handleColorChange,
    changeEmoji,
    calloutEmoji,
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
            <div className={`flex rounded-md border px-7 py-5 ${CALLOUT_COLORS[color]} `} data-testid={`callout-bg-${color}`}>
                <div>
                    {hasEmoji &&
                    <>
                        <button
                            ref={emojiButtonRef}
                            className={`mr-2 cursor-pointer rounded-md px-2 text-xl ${isEditing ? 'hover:bg-grey-500/20' : ''} ` }
                            data-testid="emoji-picker-button"
                            type="button"
                            onClick={toggleEmojiPicker}
                        >
                            {calloutEmoji}
                        </button>
                        {
                            isEditing && showEmojiPicker && (
                                <EmojiPickerPortal
                                    positionRef={emojiButtonRef}
                                    togglePortal={toggleEmojiPicker}
                                    onEmojiClick={changeEmoji} />
                            )
                        }
                    </>}
                </div>
                <KoenigNestedEditor
                    autoFocus={true}
                    defaultKoenigEnterBehaviour={true}
                    initialEditor={textEditor}
                    initialEditorState={textEditorInitialState}
                    nodes='minimal'
                    placeholderClassName={`font-serif text-xl font-normal tracking-wide text-grey-500 !dark:text-white opacity-30`}
                    placeholderText={'Callout text...'}
                    singleParagraph={true}
                    textClassName={`!my-0 w-full whitespace-normal bg-transparent font-serif text-xl font-normal ${CALLOUT_TEXT_COLORS[color]}`}
                />
            </div>
            {
                isEditing ? (
                    <SettingsPanel
                        darkMode={darkMode}
                    >
                        <ToggleSetting
                            dataTestId='emoji-toggle'
                            isChecked={!!calloutEmoji}
                            label='Emoji'
                            onChange={toggleEmoji}
                        />
                        <ColorOptionSetting
                            buttons={calloutColorPicker}
                            dataTestId='callout-color-picker'
                            label='Background'
                            layout='stacked'
                            selectedName={color}
                            onClick={handleColorChange}
                        />
                    </SettingsPanel>
                ) : (
                    <ReadOnlyOverlay />
                )
            }
        </>
    );
}

CalloutCard.propTypes = {
    color: PropTypes.oneOf(['white', 'grey', 'blue', 'green', 'yellow', 'red', 'pink', 'purple', 'accent']),
    text: PropTypes.string,
    hasEmoji: PropTypes.bool,
    placeholder: PropTypes.string,
    isEditing: PropTypes.bool,
    updateText: PropTypes.func,
    calloutEmoji: PropTypes.string,
    setShowEmojiPicker: PropTypes.func,
    toggleEmoji: PropTypes.func,
    handleColorChange: PropTypes.func,
    changeEmoji: PropTypes.func,
    textEditor: PropTypes.object,
    textEditorInitialState: PropTypes.object,
    nodeKey: PropTypes.string,
    toggleEmojiPicker: PropTypes.func,
    showEmojiPicker: PropTypes.bool
};

CalloutCard.defaultProps = {
    color: 'green',
    calloutEmoji: '💡',
    hasEmoji: true
};
