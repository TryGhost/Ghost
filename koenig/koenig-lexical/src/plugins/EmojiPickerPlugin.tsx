import Portal from '../components/ui/Portal';
import React from 'react';
import emojiData from '@emoji-mart/data';
import trackEvent from '../utils/analytics';
import useTypeaheadTriggerMatch from '../hooks/useTypeaheadTriggerMatch';
import {$createTextNode, $getSelection, $isRangeSelection, $isTextNode, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND} from 'lexical';
import {LexicalTypeaheadMenuPlugin, MenuOption} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {SearchIndex, init} from 'emoji-mart';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {EmojiMartData} from '@emoji-mart/data';

init({data: emojiData});

// the data module's synthetic default import isn't typed; cast to the shape it documents
const emojiDictionary = (emojiData as unknown as EmojiMartData).emojis;

class Emoji extends MenuOption {
    id: string;
    skins: Array<{native: string}>;

    constructor(emoji: {id: string; skins: Array<{native: string}>}) {
        super(emoji.id);
        this.id = emoji.id;
        this.skins = emoji.skins;
    }
}

const EmojiMenuItem = function ({index, isSelected, onClick, onMouseEnter, emoji}: {index: number; isSelected: boolean; onClick: (e: React.MouseEvent) => void; onMouseEnter: () => void; emoji: Emoji}) {
    return (
        <li
            key={emoji.id}
            ref={el => emoji.setRefElement(el)}
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
    const [queryString, setQueryString] = React.useState<string | null>(null);
    const [searchResults, setSearchResults] = React.useState<Emoji[] | null>(null);

    const checkForTriggerMatch = useTypeaheadTriggerMatch(':', {minLength: 1});

    const cursorInInlineCodeBlock = () => {
        return editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return false;
            }
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
                (event: KeyboardEvent) => {
                    if (!queryString) {
                        return false;
                    }
                    if (event.key === ':') {
                        if (cursorInInlineCodeBlock() === true) {
                            return false;
                        }
                        // only swallow the closing colon when there's an exact shortcode
                        // match. Look it up synchronously in the emoji dictionary — the
                        // cached async search results can lag behind the latest queryString
                        const emojiMatch = emojiDictionary[queryString];
                        if (!emojiMatch) {
                            return false;
                        }
                        handleCompletionInsertion(new Emoji(emojiMatch));
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                COMMAND_PRIORITY_HIGH
            ),
        );
    });

    const handleCompletionInsertion = React.useCallback((emoji: Emoji) => {
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
            let results: Array<{id: string; skins: Array<{native: string}>}> = [];
            if ([')','-)'].includes(queryString!)) {
                results = await SearchIndex.search('smile');
            } else if (['(','-('].includes(queryString!)) {
                results = await SearchIndex.search('frown');
            } else {
                results = await SearchIndex.search(queryString);
            }
            setSearchResults(results.map(emoji => new Emoji(emoji)));
        }

        searchEmojis();
    }, [queryString]);

    const onEmojiSelect = React.useCallback((selectedOption: Emoji, nodeToRemove: {remove: () => void} | null, closeMenu: () => void) => {
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
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSearchResults(null);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });

    function getPositionStyles() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return {marginTop: '0px'};
        }
        const selectedRange = selection.getRangeAt(0);
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
            options={searchResults ?? []}
            triggerFn={checkForTriggerMatch}
            onQueryChange={setQueryString}
            onSelectOption={onEmojiSelect}
        />
    );
}

export default EmojiPickerPlugin;
