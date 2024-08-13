import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React, {useEffect} from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {DESELECT_CARD_COMMAND, EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin.jsx';
import {HtmlCard} from '../components/ui/cards/HtmlCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {VisibilityDropdown} from '../components/ui/VisibilityDropdown.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.js';

export function HtmlNodeComponent({nodeKey, html, visibility}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [showVisibilityDropdown, setShowVisibilityDropdown] = React.useState(false);

    const isContentVisibilityEnabled = cardConfig?.feature?.contentVisibility || false;
    const isContentVisibilityActive = editor.getEditorState().read(() => {
        return $getNodeByKey(nodeKey).getIsVisibilityActive();
    });

    const [toggleEmail, toggleSegment, toggleWeb, segment, emailVisibility, webVisibility, dropdownOptions, visibilityMessage] = useVisibilityToggle(editor, nodeKey, cardConfig);

    const visibilityProps = {
        toggleEmail,
        toggleSegment,
        toggleWeb,
        segment,
        emailVisibility,
        webVisibility,
        dropdownOptions
    };

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

    const handleVisibilityToggle = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setShowVisibilityDropdown(!showVisibilityDropdown);
    };

    useEffect(() => {
        if (!cardContext.isSelected || !cardContext.isEditing) {
            setShowVisibilityDropdown(false);
        }
    }, [cardContext.isSelected, cardContext.isEditing]);

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

            {
                isContentVisibilityEnabled &&
                (
                    <VisibilityDropdown
                        editor={editor}
                        isActive={showVisibilityDropdown}
                        nodeKey={nodeKey}
                        visibility={visibility}
                        visibilityProps={visibilityProps}
                    />
                )
            }

            <ActionToolbar
                data-kg-card-toolbar="html"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="html"
                isVisible={(cardContext.isSelected && !showSnippetToolbar && !cardContext.isEditing) || showVisibilityDropdown}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    {
                        isContentVisibilityEnabled &&
                        <>
                            <ToolbarMenuItem
                                icon={isContentVisibilityActive ? 'visibilityActive' : 'visibility'}
                                isActive={isContentVisibilityActive}
                                label="Visibility"
                                onClick={handleVisibilityToggle}
                            />
                            <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                        </>
                    }
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
