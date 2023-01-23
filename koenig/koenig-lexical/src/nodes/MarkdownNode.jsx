import React from 'react';
import {MarkdownNode as BaseMarkdownNode, INSERT_MARKDOWN_COMMAND} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {ReactComponent as MarkdownCardIcon} from '../assets/icons/kg-card-type-markdown.svg';
import {MarkdownCard} from '../components/ui/cards/MarkdownCard';
import CardContext from '../context/CardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNodeByKey} from 'lexical';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_MARKDOWN_COMMAND} from '@tryghost/kg-default-nodes';

function MarkdownNodeComponent({nodeKey, markdown}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);
    const {imageUploader, unsplashConf} = React.useContext(KoenigComposerContext);

    const updateMarkdown = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setMarkdown(value);
        });
    };

    return (
        <MarkdownCard
            nodeKey={nodeKey}
            value={markdown}
            onChange={updateMarkdown}
            isEditing={cardContext.isEditing}
            imageUploader={imageUploader.getImageUrl}
            unsplashConf={unsplashConf}
        />
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

    decorate() {
        return (
            <KoenigCardWrapper wrapperStyle="wide" nodeKey={this.getKey()} width={this.__cardWidth}>
                <MarkdownNodeComponent
                    nodeKey={this.getKey()}
                    markdown={this.__markdown}
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
