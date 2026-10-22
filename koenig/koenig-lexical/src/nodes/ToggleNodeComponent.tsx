import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToggleCard} from '../components/ui/cards/ToggleCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';

interface ToggleNodeComponentProps {
    nodeKey: string;
    headingEditor: LexicalEditor;
    headingEditorInitialState: unknown;
    contentEditor: LexicalEditor;
    contentEditorInitialState: unknown;
}

export function ToggleNodeComponent({nodeKey, headingEditor, headingEditorInitialState, contentEditor, contentEditorInitialState}: ToggleNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    React.useEffect(() => {
        headingEditor.setEditable(isEditing);
        contentEditor.setEditable(isEditing);
    }, [isEditing, headingEditor, contentEditor]);

    return (
        <>
            <ToggleCard
                contentEditor={contentEditor}
                contentEditorInitialState={contentEditorInitialState as string | undefined}
                contentPlaceholder={'Collapsible content'}
                headingEditor={headingEditor}
                headingEditorInitialState={headingEditorInitialState as string | undefined}
                headingPlaceholder={'Toggle header'}
                isEditing={isEditing}
            />

            <ActionToolbar
                data-kg-card-toolbar="toggle"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="toggle"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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
