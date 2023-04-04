import CardContext from '../context/CardContext';
import React from 'react';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {ToggleCard} from '../components/ui/cards/ToggleCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ToggleNodeComponent({nodeKey, headerEditor, contentEditor}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {isEditing, isSelected} = cardContext;

    const [isContentVisible, setContentVisible] = React.useState(false);

    const toggleRef = React.useRef(null);

    React.useEffect(() => {
        if (toggleRef && toggleRef.current) {
            toggleRef.current.click();
        }
    }, []);

    const toggleContent = (event) => {
        event?.preventDefault();
        event?.stopPropagation();
        setContentVisible(!isContentVisible);
    };

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
                contentPlaceholder={'Collapsible content'}
                headerEditor={headerEditor}
                headerPlaceholder={'Toggle header'}
                isContentVisible={isContentVisible}
                isEditing={isEditing}
                toggleContent={toggleContent}
                toggleRef={toggleRef}
            />

            <ActionToolbar
                data-kg-card-toolbar="toggle"
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
