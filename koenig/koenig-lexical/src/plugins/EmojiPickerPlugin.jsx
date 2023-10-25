import EmojiPickerPortal from '../components/ui/EmojiPickerPortal';
import React from 'react';
import emojiData from '@emoji-mart/data';
import {$getSelection, $isRangeSelection} from 'lexical';
import {
    LexicalTypeaheadMenuPlugin,
    useBasicTypeaheadTriggerMatch
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {SearchIndex, init} from 'emoji-mart';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

init({data: emojiData});

export function EmojiPickerPlugin() {
    const [editor] = useLexicalComposerContext();
    const [queryString, setQueryString] = React.useState(null);
    const [searchResults, setSearchResults] = React.useState(null);
    const pickerInstance = React.useRef(null);

    const checkForTriggerMatch = useBasicTypeaheadTriggerMatch(':', {minLength: 1});

    React.useEffect(() => {
        if (!queryString) {
            pickerInstance.current?.component.setState({searchResults: null, pos: [-1, -1]});
            return;
        }

        async function searchEmojis() {
            const filteredEmojis = await SearchIndex.search(queryString);

            const grid = [];
            grid.setsize = filteredEmojis.length;
            let row = null;

            for (const emoji of filteredEmojis) {
                // 9 = EmojiPickerPortal default perLine
                if (!grid.length || row.length === 9) {
                    row = [];
                    row.__categoryId = 'search';
                    row.__index = grid.length;
                    grid.push(row);
                }

                row.push(emoji);
            }

            pickerInstance.current?.component.setState({searchResults: grid, pos: [0, 0]});
            setSearchResults(grid);
        }

        searchEmojis();
    }, [queryString]);

    const onEmojiSelect = React.useCallback((emoji, event) => {
        editor.update(() => {
            const selection = $getSelection();

            if (!$isRangeSelection(selection) || emoji === null) {
                return;
            }

            // replace the text with the emoji
            const node = selection.anchor.getNode();
            const nodeText = node.getTextContent();
            const cursorPosition = selection.anchor.offset;
            const startPosition = nodeText.lastIndexOf(':', cursorPosition);
            node.spliceText(startPosition, cursorPosition - startPosition, emoji.native, true);

            // reset the emoji picker
            pickerInstance.current?.component.setState({searchResults: null, pos: [-1, -1]});
            setSearchResults(null); // closes the emoji picker
        });
    }, [editor]);

    const setPickerInstance = function (instance) {
        pickerInstance.current = instance;
    };

    return (
        <LexicalTypeaheadMenuPlugin
            menuRenderFn={(
                anchorElementRef
            ) => {
                if (anchorElementRef.current === null || searchResults === null || searchResults.length === 0) {
                    return null;
                }

                return (
                    <EmojiPickerPortal
                        navPosition='none' // hide the category tabs, they're disabled when searching
                        positionRef={anchorElementRef}
                        searchPosition='none'
                        setInstanceRef={setPickerInstance}
                        onEmojiClick={onEmojiSelect}
                    />
                );
            }}
            options={searchResults}
            triggerFn={checkForTriggerMatch}
            onQueryChange={setQueryString}
            // TODO: add a way to close the emoji picker when the user presses escape
            // TODO: select the emoji on enter
        />
    );
}
