import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {DESELECT_CARD_COMMAND, EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin.jsx';
import {DropdownSetting, SettingsPanel, ToggleSetting} from '../components/ui/SettingsPanel.jsx';
import {HtmlCard} from '../components/ui/cards/HtmlCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.js';

export function HtmlNodeComponent({nodeKey, html}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const isContentVisibilityEnabled = cardConfig?.feature?.contentVisibility || false;
    const [toggleEmail, toggleSegment, toggleWeb, segment, emailVisibility, webVisibility, dropdownOptions, visibilityMessage] = useVisibilityToggle(editor, nodeKey, cardConfig);
    const handleSettingChange = settingFunction => (value) => {
        if (typeof value === 'string') {
            // This is for the dropdown
            settingFunction(value);
        } else {
            // This is for the toggles
            settingFunction();
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if (node.select) {
                node.select();
            }
        });
    };

    const tabs = [
        {id: 'visibility', label: 'Visibility'}
    ];

    const visibilitySettings = (
        <>
            <ToggleSetting
                dataTestId="visibility-show-on-web"
                isChecked={webVisibility}
                label="Show on web"
                onChange={handleSettingChange(toggleWeb)}
            />
            <ToggleSetting
                dataTestId="visibility-show-on-email"
                isChecked={emailVisibility}
                label="Show in email"
                onChange={handleSettingChange(toggleEmail)}
            />
            {emailVisibility && dropdownOptions && (
                <DropdownSetting
                    dataTestId="visibility-dropdown-segment"
                    label="Email audience"
                    menu={dropdownOptions}
                    value={segment}
                    onChange={value => handleSettingChange(toggleSegment)(value)}
                />
            )}
        </>
    );

    const updateHtml = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.html = value;
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const onBlur = (event) => {
        if (event?.relatedTarget?.className !== 'kg-prose') {
            editor.dispatchCommand(DESELECT_CARD_COMMAND, {cardKey: nodeKey});
        }
    };

    return (
        <>
            <HtmlCard
                darkMode={darkMode}
                html={html}
                isEditing={cardContext.isEditing}
                nodeKey={nodeKey}
                unsplashConf={cardConfig.unsplash}
                updateHtml={updateHtml}
                visibilityMessage={visibilityMessage}
                onBlur={onBlur}
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

            {cardContext.isEditing && isContentVisibilityEnabled && (
                <SettingsPanel 
                    darkMode={darkMode} 
                    defaultTab="visibility"
                    tabs={tabs}
                    onMouseDown={e => e.preventDefault()}
                >
                    {{
                        visibility: visibilitySettings
                    }}
                </SettingsPanel>
            )}
        </>
    );
}