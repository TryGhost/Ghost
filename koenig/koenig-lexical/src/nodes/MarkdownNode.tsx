import KoenigCardWrapper from '../components/KoenigCardWrapper';
import MarkdownCardIcon from '../assets/icons/kg-card-type-markdown.svg?react';
import MarkdownIndicatorIcon from '../assets/icons/kg-indicator-markdown.svg?react';
import {MarkdownNode as BaseMarkdownNode, type MarkdownData} from '@tryghost/kg-default-nodes';
import {MarkdownNodeComponent} from './MarkdownNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_MARKDOWN_COMMAND = createCommand<MarkdownData>();

export class MarkdownNode extends BaseMarkdownNode {
    static kgMenu = {
        label: 'Markdown',
        desc: 'Insert a Markdown editor card',
        Icon: MarkdownCardIcon,
        insertCommand: INSERT_MARKDOWN_COMMAND,
        matches: ['markdown', 'md'],
        priority: 19,
        shortcut: '/md'
    };

    getIcon() {
        return MarkdownCardIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={MarkdownIndicatorIcon}
                nodeKey={this.getKey()}
                wrapperStyle="wide"
            >
                <MarkdownNodeComponent
                    markdown={this.markdown}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createMarkdownNode(dataset: MarkdownData) {
    return new MarkdownNode(dataset);
}

export function $isMarkdownNode(node: unknown): node is MarkdownNode {
    return node instanceof MarkdownNode;
}
