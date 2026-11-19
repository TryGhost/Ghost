import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {CalloutCard} from '../components/ui/cards/CalloutCard';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {CalloutColor} from '../components/ui/cards/CalloutCard';
import type {CalloutNode} from '@tryghost/kg-default-nodes';
import type {LexicalEditor} from 'lexical';

interface CalloutNodeComponentProps {
    nodeKey: string;
    textEditor: LexicalEditor;
    textEditorInitialState: unknown;
    backgroundColor: string;
    calloutEmoji: string;
}

export function CalloutNodeComponent({nodeKey, textEditor, textEditorInitialState, backgroundColor, calloutEmoji}: CalloutNodeComponentProps) {
    const [editor] = useLexicalComposerContext();

    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [emoji, setEmoji] = React.useState(calloutEmoji);
    const [hasEmoji, setHasEmoji] = React.useState(calloutEmoji ? true : false);

    const toggleEmoji = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        setEditing(true); // keep card selected when toggling emoji (else we lose the settings pane on deselection)
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CalloutNode | null;
            if (!node) {return;}
            setHasEmoji(event.target.checked);
            if (event.target.checked && emoji === '') {
                node.calloutEmoji = '💡';
            } else {
                node.calloutEmoji = event.target.checked ? emoji : '';
            }
        });
    };

    const handleColorChange = (color: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CalloutNode | null;
            if (!node) {return;}
            node.backgroundColor = color;
        });
    };

    const handleEmojiChange = (event: {native: string}) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CalloutNode | null;
            if (!node) {return;}
            setEmoji(event.native);
            node.calloutEmoji = event.native;
            toggleEmojiPicker();
        });
    };

    const toggleEmojiPicker = () => {
        if (!isEditing) {
            setEditing(true);
        }

        if (showEmojiPicker) {
            textEditor.focus();
        }
        setShowEmojiPicker(!showEmojiPicker);
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    React.useEffect(() => {
        textEditor.setEditable(isEditing);
    }, [isEditing, textEditor]);

    return (
        <>
            <CalloutCard
                calloutEmoji={calloutEmoji as string | undefined}
                changeEmoji={handleEmojiChange}
                color={backgroundColor as CalloutColor | undefined}
                handleColorChange={handleColorChange}
                hasEmoji={hasEmoji}
                isEditing={isEditing}
                nodeKey={nodeKey}
                setShowEmojiPicker={setShowEmojiPicker}
                showEmojiPicker={showEmojiPicker}
                textEditor={textEditor}
                textEditorInitialState={textEditorInitialState as string | undefined}
                toggleEmoji={toggleEmoji}
                toggleEmojiPicker={toggleEmojiPicker}
            />
            <ActionToolbar
                data-kg-card-toolbar="callout"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="callout"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-callout-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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
