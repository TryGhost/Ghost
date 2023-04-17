import CardContext from '../context/CardContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {MarkdownNode as BaseMarkdownNode, INSERT_MARKDOWN_COMMAND} from '@tryghost/kg-default-nodes';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin.jsx';
import {MarkdownCard} from '../components/ui/cards/MarkdownCard';
import {ReactComponent as MarkdownCardIcon} from '../assets/icons/kg-card-type-markdown.svg';
import {ReactComponent as MarkdownIndicatorIcon} from '../assets/icons/kg-indicator-markdown.svg';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_MARKDOWN_COMMAND} from '@tryghost/kg-default-nodes';

function MarkdownNodeComponent({nodeKey, markdown}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const updateMarkdown = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setMarkdown(value);
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    return (
        <>
            <MarkdownCard
                imageUploader={fileUploader.useFileUpload}
                isEditing={cardContext.isEditing}
                markdown={markdown}
                nodeKey={nodeKey}
                unsplashConf={cardConfig.unsplash}
                updateMarkdown={updateMarkdown}
            />

            <ActionToolbar
                data-kg-card-toolbar="markdown"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="markdown"
                isVisible={markdown && cardContext.isSelected && !cardContext.isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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

export class MarkdownNode extends BaseMarkdownNode {
    static kgMenu = {
        label: 'Markdown',
        desc: 'Insert a Markdown editor card',
        Icon: MarkdownCardIcon,
        insertCommand: INSERT_MARKDOWN_COMMAND,
        matches: ['markdown', 'md']
    };

    static getType() {
        return 'markdown';
    }

    getIcon() {
        return MarkdownCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={MarkdownIndicatorIcon}
                nodeKey={this.getKey()}
                width={this.__cardWidth}
                wrapperStyle="wide"
            >
                <MarkdownNodeComponent
                    markdown={this.__markdown}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createMarkdownNode(dataset) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node) {
    return node instanceof MarkdownNode;
}
