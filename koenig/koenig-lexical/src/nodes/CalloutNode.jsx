import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import generateEditorState from '../utils/generateEditorState';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getNodeByKey, createEditor} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CalloutNode as BaseCalloutNode, INSERT_CALLOUT_COMMAND} from '@tryghost/kg-default-nodes';
import {CalloutCard} from '../components/ui/cards/CalloutCard';
import {ReactComponent as CalloutCardIcon} from '../assets/icons/kg-card-type-callout.svg';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {sanitizeHtml} from '../utils/sanitize-html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_CALLOUT_COMMAND} from '@tryghost/kg-default-nodes';

function CalloutNodeComponent({nodeKey, textEditor, textEditorInitialState, hasEmoji, backgroundColor, emojiValue}) {
    const [editor] = useLexicalComposerContext();

    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const toggleEmoji = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setHasEmoji(event.target.checked);
        });
    };

    const handleColorChange = (color) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundColor(color);
        });
    };

    const handleEmojiChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setEmojiValue(event.native);
            toggleEmojiPicker();
        });
    };

    const toggleEmojiPicker = () => {
        if (!isEditing) {
            setEditing(true);
            return;
        }
        setShowEmojiPicker(!showEmojiPicker);
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    React.useEffect(() => {
        textEditor.setEditable(isEditing);
    }, [isEditing, textEditor]);

    return (
        <>
            <CalloutCard
                changeEmoji={handleEmojiChange}
                color={backgroundColor}
                emoji={hasEmoji}
                emojiValue={emojiValue}
                handleColorChange={handleColorChange}
                isEditing={isEditing}
                nodeKey={nodeKey}
                sanitizeHtml={sanitizeHtml}
                setShowEmojiPicker={setShowEmojiPicker}
                showEmojiPicker={showEmojiPicker}
                textEditor={textEditor}
                textEditorInitialState={textEditorInitialState}
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
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export class CalloutNode extends BaseCalloutNode {
    __textEditor;
    __textEditorInitialState;

    static kgMenu = [{
        label: 'Callout',
        desc: 'Info boxes that stand out',
        Icon: CalloutCardIcon,
        insertCommand: INSERT_CALLOUT_COMMAND,
        matches: ['callout']
    }];

    getIcon() {
        return CalloutCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);
        // set up and populate nested editor from the serialized HTML
        this.__textEditor = dataset.textEditor || createEditor({nodes: MINIMAL_NODES});
        this.__textEditorInitialState = dataset.textEditorInitialState;
        if (!this.__textEditorInitialState) {
            this.__textEditorInitialState = generateEditorState({
                editor: createEditor({nodes: MINIMAL_NODES}),
                initialHtml: dataset.text ? `<p>${dataset.text}</p>` : '' // wrap with paragraph to interpret as ParagraphNode (needed for nested editor)
            });
        }
    }

    exportJSON() {
        const json = super.exportJSON();

        // convert nested editor instance back into HTML because `text` may not
        // be automatically updated when the nested editor changes
        if (this.__textEditor) {
            this.__textEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__textEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.text = cleanedHtml;
            });
        }

        return json;
    }

    createDOM() {
        return document.createElement('div');
    }

    getDataset() {
        const dataset = super.getDataset();

        // client-side only data properties such as nested editors
        const self = this.getLatest();
        dataset.textEditor = self.__textEditor;
        dataset.textEditorInitialState = self.__textEditorInitialState;

        return dataset;
    }

    updateDOM() {
        return false;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <CalloutNodeComponent
                    backgroundColor={this.__backgroundColor}
                    emojiValue={this.__emojiValue}
                    hasEmoji={this.__hasEmoji}
                    nodeKey={this.getKey()}
                    textEditor={this.__textEditor}
                    textEditorInitialState={this.__textEditorInitialState}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createCalloutNode = (dataset) => {
    return new CalloutNode(dataset);
};

export function $isCalloutNode(node) {
    return node instanceof CalloutNode;
}
