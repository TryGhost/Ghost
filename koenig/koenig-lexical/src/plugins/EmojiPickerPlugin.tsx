import Portal from '../components/ui/Portal';
import React from 'react';
import emojiData from '@emoji-mart/data';
import trackEvent from '../utils/analytics';
import useTypeaheadTriggerMatch from '../hooks/useTypeaheadTriggerMatch';
import {$createTextNode, $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND} from 'lexical';
import {LexicalTypeaheadMenuPlugin} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {SearchIndex, init} from 'emoji-mart';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

init({data: emojiData});

const EmojiMenuItem = function ({index, isSelected, onClick, onMouseEnter, emoji}) {
    // we need to manually set this unless we import the MenuOption type and extend it (see LexicalTypeaheadMenuPlugin)
    const ref = React.useRef(null);
    emoji.ref = ref;
    return (
        <li
            key={emoji.id}
            ref={emoji.ref}
            aria-selected={isSelected}
            className={`mb-0 flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 font-sans text-sm leading-[1.65] tracking-wide text-grey-800 dark:text-grey-200 ${isSelected ? 'bg-grey-100 text-grey-900 dark:bg-grey-900 dark:text-white' : ''}`}
            data-testid={'emoji-option-' + index}
            id={'emoji-option-' + index}
            role="option"
            tabIndex={-1}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
        >
            <span className="font-serif text-lg">{emoji.skins[0].native}</span>
            <span className="truncate">{emoji.id}</span>
        </li>
    );
};

export function EmojiPickerPlugin() {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = React.useState(null);
    const [searchResults, setSearchResults] = React.useState(null);

    const checkForTriggerMatch = useTypeaheadTriggerMatch(':', {minLength: 1});

    const cursorInInlineCodeBlock = () => {
        return editor.getEditorState().read(() => {
            const selection = $getSelection();
            const node = selection.anchor.getNode();
            if (node && $isTextNode(node) && node.hasFormat('code')) {
                return true;
            }
            return false;
        });
    };

    // handle exact match typed like :emoji:
    //  the typeahead menu does not account for exact matches/closing characters
    React.useEffect(() => {
        return mergeRegister(
            editor.registerCommand(
                KEY_DOWN_COMMAND,
                async (event) => {
                    if (!queryString) {
                        return false;
                    }
                    if (event.key === ':') {
                        if (cursorInInlineCodeBlock() === true) {
                            return false;
                        }
                        const emojis = await SearchIndex.search(queryString);
                        if (emojis.length === 0) {
                            return;
                        }
                        const emojiMatch = emojis?.[0].id === queryString; // only look for exact match
                        if (emojiMatch) {
                            handleCompletionInsertion(emojis[0]);
                            event.preventDefault();
                            return true;
                        }
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
        );
    });

    const handleCompletionInsertion = React.useCallback((emoji) => {
        editor.update(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection) || emoji === null) {
                return;
            }

            const currentNode = selection.anchor.getNode();
            // need to replace the last text matching the :test: pattern with a single emoji
            const shortcodeLength = emoji.id.length + 1; // +1 for the end colon
            const textNode = currentNode.spliceText(selection.anchor.offset - shortcodeLength, shortcodeLength, emoji.skins[0].native, true);
            textNode.setFormat(selection.format);

            trackEvent('Emoji Inserted', {method: 'completed'});
        });
    }, [editor]);

    React.useEffect(() => {
        if (!queryString) {
            setSearchResults(null);
            return;
        }

        async function searchEmojis() {
            let filteredEmojis = [];
            if ([')','-)'].includes(queryString)) {
                filteredEmojis = await SearchIndex.search('smile');
            } else if (['(','-('].includes(queryString)) {
                filteredEmojis = await SearchIndex.search('frown');
            } else {
                filteredEmojis = await SearchIndex.search(queryString);
            }
            setSearchResults(filteredEmojis);
        }

        searchEmojis();
    }, [queryString]);

    const onEmojiSelect = React.useCallback((selectedOption, nodeToRemove, closeMenu) => {
        editor.update(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection) || selectedOption === null) {
                return;
            }

            if (nodeToRemove) {
                nodeToRemove.remove();
            }

            const emojiNode = $createTextNode(selectedOption.skins[0].native);
            emojiNode.setFormat(selection.format);

            selection.insertNodes([emojiNode]);

            closeMenu();

            trackEvent('Emoji Inserted', {method: 'selected'});
        });
    }, [editor]);

    // close menu on escape
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSearchResults(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });

    function getPositionStyles() {
        const selectedRange = window.getSelection().getRangeAt(0);
        const rangeRect = selectedRange.getBoundingClientRect();

        return {
            marginTop: `${rangeRect.height}px`
        };
    }

    return (
        <LexicalTypeaheadMenuPlugin
            menuRenderFn={(
                anchorElementRef,
                {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}
            ) => {
                if (anchorElementRef.current === null || !searchResults || searchResults.length === 0) {
                    return null;
                }
                return (
                    <Portal className="w-[240px]" to={anchorElementRef.current}>
                        <ul className="relative z-10 max-h-[214px] select-none scroll-p-2 list-none overflow-y-auto rounded-md bg-white p-1  shadow-md dark:bg-grey-950" data-testid="emoji-menu" style={getPositionStyles()}>
                            {searchResults.map((emoji, index) => (
                                <div key={emoji.id}>
                                    <EmojiMenuItem
                                        emoji={emoji}
                                        index={index}
                                        isSelected={selectedIndex === index}
                                        onClick={(event) => {
                                            setHighlightedIndex(index);
                                            selectOptionAndCleanUp(emoji);
                                            event.stopPropagation();
                                            event.preventDefault();
                                        }}
                                        onMouseEnter={() => {
                                            setHighlightedIndex(index);
                                        }}
                                    />
                                </div>
                            ))}
                        </ul>
                    </Portal>
                );
            }}
            options={searchResults}
            triggerFn={checkForTriggerMatch}
            onQueryChange={setQueryString}
            onSelectOption={onEmojiSelect}
        />
    );
}

export default EmojiPickerPlugin;
