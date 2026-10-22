import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {EmailCtaCard} from '../components/ui/cards/EmailCtaCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {EmailCtaNode} from './EmailCtaNode';
import type {LexicalEditor} from 'lexical';

function $getEmailCtaNodeByKey(nodeKey: string): EmailCtaNode | null {
    return $getNodeByKey(nodeKey) as EmailCtaNode | null;
}

interface EmailCtaNodeComponentProps {
    nodeKey: string;
    alignment: string;
    htmlEditor: LexicalEditor;
    htmlEditorInitialState: string | undefined;
    segment: string;
    showDividers: boolean;
    showButton: boolean;
    buttonText: string;
    buttonUrl: string;
}

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
}: EmailCtaNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {isEditing, isSelected} = cardContext;
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const handleSegmentChange = (value: string) => {
        if (value !== 'status:free' && value !== 'status:-free') {return;}
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.segment = value;
        });
    };

    React.useEffect(() => {
        htmlEditor.setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    const updateAlignment = (value: string) => {
        if (value !== 'left' && value !== 'center') {return;}
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.alignment = value;
        });
    };

    const toggleDividers = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.showDividers = event.target.checked;
        });
    };

    const updateShowButton = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.showButton = event.target.checked;
        });
    };

    const updateButtonText = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonText = event.target.value;
        });
    };

    const updateButtonUrl = (val: string) => {
        editor.update(() => {
            const node = $getEmailCtaNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonUrl = val;
        });
    };

    return (
        <>
            <EmailCtaCard
                alignment={alignment as 'left' | 'center' | undefined}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                handleSegmentChange={handleSegmentChange}
                htmlEditor={htmlEditor}
                htmlEditorInitialState={htmlEditorInitialState}
                isEditing={isEditing}
                segment={segment as 'status:free' | 'status:-free' | undefined}
                showButton={showButton}
                showDividers={showDividers}
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
