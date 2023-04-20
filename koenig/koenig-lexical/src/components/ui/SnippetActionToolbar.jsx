import KoenigComposerContext from '../../context/KoenigComposerContext.jsx';
import React from 'react';
import {$createNodeSelection, $getSelection} from 'lexical';
import {$generateJSONFromSelectedNodes} from '@lexical/clipboard';
import {SELECT_CARD_COMMAND} from '../../plugins/KoenigBehaviourPlugin.jsx';
import {SnippetInput} from './SnippetInput';
import {useKoenigSelectedCardContext} from '../../context/KoenigSelectedCardContext.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function SnippetActionToolbar({onClose}) {
    const {cardConfig: {snippets, createSnippet}} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const {selectedCardKey} = useKoenigSelectedCardContext();
    const [value, setValue] = React.useState('');

    const handleChange = (event) => {
        setValue(event.target.value);
    };

    const handleSnippetCreation = (snippetName) => {
        editor.update(() => {
            if (selectedCardKey) {
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(selectedCardKey);

                const nodeJson = $generateJSONFromSelectedNodes(editor, nodeSelection);
                createSnippet({name: snippetName, value: JSON.stringify(nodeJson)});
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: selectedCardKey});
            } else {
                const selection = $getSelection();

                const nodeJson = $generateJSONFromSelectedNodes(editor, selection);
                createSnippet({name: snippetName, value: JSON.stringify(nodeJson)});
            }

            onClose?.();
        });
    };

    return (
        <SnippetInput
            snippets={snippets}
            value={value}
            onChange={handleChange}
            onClose={onClose}
            onCreateSnippet={() => handleSnippetCreation(value)}
            onUpdateSnippet={name => handleSnippetCreation(name)}
        />
    );
}
