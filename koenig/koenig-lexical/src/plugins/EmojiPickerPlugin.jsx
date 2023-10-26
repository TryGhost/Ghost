import Portal from '../components/ui/Portal';
import React from 'react';
import emojiData from '@emoji-mart/data';
import useTypeaheadTriggerMatch from '../hooks/useTypeaheadTriggerMatch';
import {$createTextNode, $getSelection, $isRangeSelection} from 'lexical';
import {LexicalTypeaheadMenuPlugin} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {SearchIndex, init} from 'emoji-mart';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

init({data: emojiData});

const EmojiMenuItem = function ({index, isSelected, onClick, onMouseEnter, emoji}) {
    return (
        <li
            key={emoji.id}
            aria-selected={isSelected}
            className={`mb-0 flex cursor-pointer items-center gap-2 whitespace-nowrap rounded px-2 py-1 font-sans text-sm leading-[1.65] tracking-wide text-grey-800 ${isSelected ? 'bg-grey-100 text-grey-900' : ''}`}
            data-testid={'emoji-option-' + index}
            id={'emoji-option-' + index}
            role="option"
            tabIndex={-1}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
        >
            <span className="text-lg">{emoji.skins[0].native}</span>
            <span className="truncate">{emoji.id}</span>
        </li>
    );
};

export function EmojiPickerPlugin() {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = React.useState(null);
    const [searchResults, setSearchResults] = React.useState(null);

    const checkForTriggerMatch = useTypeaheadTriggerMatch(':', {minLength: 1});

    React.useEffect(() => {
        if (!queryString) {
            setSearchResults(null);
            return;
        }

        async function searchEmojis() {
            const filteredEmojis = await SearchIndex.search(queryString);
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

            selection.insertNodes([$createTextNode(selectedOption.skins[0].native)]);

            closeMenu();
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

    return (
        <LexicalTypeaheadMenuPlugin
            menuRenderFn={(
                anchorElementRef,
                {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}
            ) => {
                if (anchorElementRef.current === null || searchResults === null || searchResults.length === 0) {
                    return null;
                }

                return (
                    <Portal to={anchorElementRef.current}>
                        <ul className="absolute top-[25px] max-h-[196px] w-[240px] list-none overflow-y-auto bg-white p-1 shadow" data-testid="emoji-menu">
                            {searchResults.map((emoji, index) => (
                                <div key={emoji.id}>
                                    <EmojiMenuItem
                                        emoji={emoji}
                                        index={index}
                                        isSelected={selectedIndex === index}
                                        onClick={() => {
                                            setHighlightedIndex(index);
                                            selectOptionAndCleanUp(emoji);
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
