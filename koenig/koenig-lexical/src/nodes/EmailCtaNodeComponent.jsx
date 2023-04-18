import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
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
    showDividers,
    showButton,
    buttonText,
    buttonUrl
}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [listOptions, setListOptions] = React.useState([]);

    React.useEffect(() => {
        if (cardConfig.fetchAutocompleteLinks) {
            cardConfig.fetchAutocompleteLinks().then((links) => {
                setListOptions(links.map((link) => {
                    return {value: link.value, label: link.label};
                }));
            });
        }
    }, [cardConfig]);

    const suggestedUrls = listOptions.filter((u) => {
        return u.label.toLocaleLowerCase().includes(buttonUrl.toLocaleLowerCase());
    });

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

    const updateShowButton = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setShowButton(event.target.checked);
        });
    };

    const updateButtonText = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonText(event.target.value);
        });
    };

    const updateButtonUrl = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(val);
        });
    };

    return (
        <>
            <EmailCtaCard
                alignment={alignment}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                handleSegmentChange={handleSegmentChange}
                htmlEditor={htmlEditor}
                htmlEditorInitialState={htmlEditorInitialState}
                isEditing={isEditing}
                segment={segment}
                showButton={showButton}
                showDividers={showDividers}
                suggestedUrls={suggestedUrls}
                toggleDividers={toggleDividers}
                updateAlignment={updateAlignment}
                updateButtonText={updateButtonText}
                updateButtonUrl={updateButtonUrl}
                updateShowButton={updateShowButton}
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
