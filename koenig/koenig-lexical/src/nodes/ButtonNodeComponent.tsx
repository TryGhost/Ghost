import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {$isButtonNode} from './ButtonNode';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ButtonCard} from '../components/ui/cards/ButtonCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

interface ButtonNodeComponentProps {
    alignment: string;
    buttonText: string;
    buttonUrl: string;
    nodeKey: string;
}

export function ButtonNodeComponent({alignment, buttonText, buttonUrl, nodeKey}: ButtonNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!$isButtonNode(node)) {return;}
            node.buttonText = event.target.value;
        });
    };

    const handleButtonUrlChange = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!$isButtonNode(node)) {return;}
            node.buttonUrl = val;
        });
    };

    const handleAlignmentChange = (value: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (!$isButtonNode(node)) {return;}
            node.alignment = value;
        });
    };

    return (
        <>
            <ButtonCard
                alignment={alignment}
                buttonPlaceholder={`Add button text`}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                handleAlignmentChange={handleAlignmentChange}
                handleButtonTextChange={handleButtonTextChange}
                handleButtonUrlChange={handleButtonUrlChange}
                isEditing={isEditing}
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
                    <ToolbarMenuItem dataTestId="edit-button-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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