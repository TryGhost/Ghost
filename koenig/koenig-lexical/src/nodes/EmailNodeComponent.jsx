import CardContext from '../context/CardContext';
import React from 'react';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {EmailCard} from '../components/ui/cards/EmailCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function EmailNodeComponent({nodeKey, htmlEditor}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {isEditing, isSelected} = cardContext;

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    React.useEffect(() => {
        htmlEditor.setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    return (
        <>
            <EmailCard
                htmlEditor={htmlEditor}
                isEditing={isEditing}
            />

            <ActionToolbar
                data-kg-card-toolbar="email"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="snippet" isActive={false} label="Snippet" />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
