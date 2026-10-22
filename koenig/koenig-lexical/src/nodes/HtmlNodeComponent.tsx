import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND, SHOW_CARD_VISIBILITY_SETTINGS_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {HtmlCard} from '../components/ui/cards/HtmlCard';
import {SettingsPanel} from '../components/ui/SettingsPanel';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {VisibilitySettings} from '../components/ui/VisibilitySettings';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle';
import type {HtmlNode} from '@tryghost/kg-default-nodes';

interface HtmlNodeComponentProps {
    nodeKey: string;
    html: string;
}

export function HtmlNodeComponent({nodeKey, html}: HtmlNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const {showVisibilitySettings} = useKoenigSelectedCardContext();

    const {isVisibilityEnabled, visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    const settingsTabs = [
        {id: 'visibility', label: 'Visibility'}
    ];

    const updateHtml = (value: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as HtmlNode | null;
            if (!node) {return;}
            node.html = value;
        });
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const visibilitySettings = (
        <VisibilitySettings
            toggleVisibility={toggleVisibility}
            visibilityOptions={visibilityOptions}
        />
    );

    const handleVisibilityToggle = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, {cardKey: nodeKey});
    }, [editor, nodeKey]);

    return (
        <>
            <HtmlCard
                darkMode={darkMode}
                html={html}
                isEditing={cardContext.isEditing}
                updateHtml={updateHtml}
            />

            <ActionToolbar
                data-kg-card-toolbar="html"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="html"
                isVisible={(cardContext.isSelected && !showSnippetToolbar && !cardContext.isEditing)}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="edit-html"
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={handleToolbarEdit}
                    />
                    {isVisibilityEnabled && (
                        <>
                            <ToolbarMenuSeparator />
                            <ToolbarMenuItem
                                dataTestId="show-visibility"
                                icon="visibility"
                                isActive={showVisibilitySettings}
                                label="Visibility"
                                onClick={handleVisibilityToggle}
                            />
                        </>
                    )}
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

            {isVisibilityEnabled && showVisibilitySettings && cardContext.isSelected && (
                <SettingsPanel
                    darkMode={darkMode}
                    defaultTab="visibility"
                    tabs={settingsTabs}
                >
                    {{
                        visibility: visibilitySettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}
