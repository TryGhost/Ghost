import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToggleCard} from '../components/ui/cards/ToggleCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ToggleNodeComponent({nodeKey, headerEditor, headerEditorInitialState, contentEditor, contentEditorInitialState}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    React.useEffect(() => {
        headerEditor.setEditable(isEditing);
        contentEditor.setEditable(isEditing);
    }, [isEditing, headerEditor, contentEditor]);

    return (
        <>
            <ToggleCard
                contentEditor={contentEditor}
                contentEditorInitialState={contentEditorInitialState}
                contentPlaceholder={'Collapsible content'}
                headerEditor={headerEditor}
                headerEditorInitialState={headerEditorInitialState}
                headerPlaceholder={'Toggle header'}
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
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
