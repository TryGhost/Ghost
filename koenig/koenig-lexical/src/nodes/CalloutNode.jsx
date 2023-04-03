import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MINIMAL_NODES from './MinimalNodes';
import React from 'react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import populateNestedEditor from '../utils/populateNestedEditor';
import {$generateHtmlFromNodes} from '@lexical/html';
import {$getNodeByKey, createEditor} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CalloutNode as BaseCalloutNode, INSERT_CALLOUT_COMMAND} from '@tryghost/kg-default-nodes';
import {CalloutCard} from '../components/ui/cards/CalloutCard';
import {ReactComponent as CalloutCardIcon} from '../assets/icons/kg-card-type-callout.svg';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {sanitizeHtml} from '../utils/sanitize-html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_CALLOUT_COMMAND} from '@tryghost/kg-default-nodes';

function CalloutNodeComponent({nodeKey, textEditor, hasEmoji, backgroundColor, emojiValue}) {
    const [editor] = useLexicalComposerContext();

    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

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

    // TODO: this should be handled by KoenigBehaviourPlugin when inserting card
    React.useEffect(() => {
        if (!isEditing && isSelected) {
            setEditing(true);
        }
        // only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

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
                toggleEmoji={toggleEmoji}
                toggleEmojiPicker={toggleEmojiPicker}
            />
            <ActionToolbar
                data-kg-card-toolbar="callout"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-callout-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="snippet" isActive={false} label="Snippet" />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export class CalloutNode extends BaseCalloutNode {
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
        if (!dataset.textEditor) {
            populateNestedEditor({editor: this.__textEditor, initialHtml: dataset.text});
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
