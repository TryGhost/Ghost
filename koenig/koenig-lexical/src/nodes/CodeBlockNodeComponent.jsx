import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CodeBlockCard} from '../components/ui/cards/CodeBlockCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function CodeBlockNodeComponent({nodeKey, captionEditor, captionEditorInitialState, code, language}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, setEditing, isSelected} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const updateCode = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCode(value);
        });
    };

    const updateLanguage = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLanguage(value);
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    return (
        <>
            <CodeBlockCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                code={code}
                handleToolbarEdit={handleToolbarEdit}
                isEditing={isEditing}
                isSelected={isSelected}
                language={language}
                nodeKey={nodeKey}
                updateCode={updateCode}
                updateLanguage={updateLanguage}
            />
            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-code-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
