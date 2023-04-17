import CardContext from '../context/CardContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {EmailCtaCard} from '../components/ui/cards/EmailCtaCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function EmailCtaNodeComponent({
    nodeKey,
    alignment,
    htmlEditor,
    htmlEditorInitialState,
    segment,
    showDividers
}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    const handleSegmentChange = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSegment(value);
        });
    };

    React.useEffect(() => {
        htmlEditor.setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    const updateAlignment = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setAlignment(value);
        });
    };

    const toggleDividers = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setShowDividers(event.target.checked);
        });
    };

    return (
        <>
            <EmailCtaCard
                alignment={alignment}
                handleSegmentChange={handleSegmentChange}
                htmlEditor={htmlEditor}
                htmlEditorInitialState={htmlEditorInitialState}
                isEditing={isEditing}
                segment={segment}
                showDividers={showDividers}
                toggleDividers={toggleDividers}
                updateAlignment={updateAlignment}
            />

            <ActionToolbar
                data-kg-card-toolbar="email-cta"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="email-cta"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem
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
