import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import {$createNodeSelection, $getSelection} from 'lexical';
import {$generateJSONFromSelectedNodes} from '@lexical/clipboard';
import {SELECT_CARD_COMMAND} from '../../plugins/KoenigBehaviourPlugin';
import {SnippetInput} from './SnippetInput';
import {useKoenigSelectedCardContext} from '../../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

interface SnippetActionToolbarProps {
    onClose?: () => void;
    [key: string]: unknown;
}

export function SnippetActionToolbar({onClose, ...props}: SnippetActionToolbarProps) {
    const {cardConfig: {snippets, createSnippet}, darkMode} = React.useContext(KoenigComposerContext);
    const [editor] = useLexicalComposerContext();
    const {selectedCardKey} = useKoenigSelectedCardContext();
    const [value, setValue] = React.useState('');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value);
    };

    const handleSnippetCreation = (snippetName: string) => {
        editor.update(() => {
            if (selectedCardKey) {
                const nodeSelection = $createNodeSelection();
                nodeSelection.add(selectedCardKey);

                const nodeJson = $generateJSONFromSelectedNodes(editor, nodeSelection);
                createSnippet?.({name: snippetName, value: JSON.stringify(nodeJson)});
                editor.dispatchCommand(SELECT_CARD_COMMAND, {cardKey: selectedCardKey});
            } else {
                const selection = $getSelection();

                const nodeJson = $generateJSONFromSelectedNodes(editor, selection);
                createSnippet?.({name: snippetName, value: JSON.stringify(nodeJson)});
            }

            onClose?.();
            editor.getRootElement()?.focus();
        });
    };

    return (
        <SnippetInput
            darkMode={darkMode}
            snippets={snippets}
            value={value}
            onChange={handleChange}
            onClose={onClose ?? (() => {})}
            onCreateSnippet={() => handleSnippetCreation(value)}
            onUpdateSnippet={(name: string) => handleSnippetCreation(name)}
            {...props}
        />
    );
}
