import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
// TODO: Re-enable when design tab is implemented
// import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {SettingsPanel} from '../components/ui/SettingsPanel.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {TransistorCard} from '../components/ui/cards/TransistorCard.jsx';
import {VisibilitySettings} from '../components/ui/VisibilitySettings.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.js';

export const TransistorNodeComponent = ({
    nodeKey,
    accentColor,
    backgroundColor
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const {visibilityOptions: rawVisibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    // Filter out nonMembers option - Transistor requires a member UUID so public visitors can't see it
    const visibilityOptions = React.useMemo(() => {
        return rawVisibilityOptions.map(group => ({
            ...group,
            toggles: group.toggles.filter(toggle => toggle.key !== 'nonMembers')
        }));
    }, [rawVisibilityOptions]);

    const settingsTabs = [
        {id: 'visibility', label: 'Visibility'}
    ];

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

    const visibilitySettings = (
        <VisibilitySettings
            toggleVisibility={toggleVisibility}
            visibilityOptions={visibilityOptions}
        />
    );

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
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={handleToolbarEdit}
                    />
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

            {isEditing && (
                <SettingsPanel
                    darkMode={darkMode}
                    defaultTab="visibility"
                    tabs={settingsTabs}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    {{
                        visibility: visibilitySettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
};
