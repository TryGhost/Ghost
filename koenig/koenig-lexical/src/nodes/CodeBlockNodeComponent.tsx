import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {CodeBlockCard} from '../components/ui/cards/CodeBlockCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {CodeBlockNode} from '@tryghost/kg-default-nodes';
import type {LexicalEditor} from 'lexical';

interface CodeBlockNodeComponentProps {
    nodeKey: string;
    captionEditor: LexicalEditor;
    captionEditorInitialState: unknown;
    code: string;
    language: string;
}

export function CodeBlockNodeComponent({nodeKey, captionEditor, captionEditorInitialState, code, language}: CodeBlockNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, setEditing, isSelected} = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const updateCode = (value: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CodeBlockNode | null;
            if (!node) {return;}
            node.code = value;
        });
    };

    const updateLanguage = (value: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CodeBlockNode | null;
            if (!node) {return;}
            node.language = value;
        });
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    return (
        <>
            <CodeBlockCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState as string | undefined}
                code={code}
                darkMode={darkMode}
                isEditing={isEditing}
                isSelected={isSelected}
                language={language}
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
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
