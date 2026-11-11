import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
// TODO: Re-enable when design tab is implemented
// import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CardSettingsPanel} from '../components/CardSettingsPanel';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {TransistorCard} from '../components/ui/cards/TransistorCard.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.js';

export const TransistorNodeComponent = ({
    nodeKey,
    accentColor,
    backgroundColor
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const {isVisibilityEnabled} = useVisibilityToggle(editor, nodeKey, cardConfig);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    // TODO: Re-enable when design tab is implemented
    // const handleAccentColorChange = (val) => {
    //     editor.update(() => {
    //         const node = $getNodeByKey(nodeKey);
    //         node.accentColor = val;
    //     });
    // };

    // const handleBackgroundColorChange = (val) => {
    //     editor.update(() => {
    //         const node = $getNodeByKey(nodeKey);
    //         node.backgroundColor = val;
    //     });
    // };

    return (
        <>
            <TransistorCard
                accentColor={accentColor}
                backgroundColor={backgroundColor}
            />

            <ActionToolbar
                data-kg-card-toolbar="transistor"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="transistor"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="edit-transistor-card"
                        hide={!isVisibilityEnabled}
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={handleToolbarEdit}
                    />
                    <ToolbarMenuSeparator hide={!isVisibilityEnabled || !cardConfig.createSnippet} />
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

            {/* Transistor needs a member UUID, so public visitors can't be shown the player */}
            <CardSettingsPanel hiddenVisibilityToggles={['nonMembers']} />
        </>
    );
};
