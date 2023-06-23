import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {MarkdownNode as BaseMarkdownNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as MarkdownCardIcon} from '../assets/icons/kg-card-type-markdown.svg';
import {ReactComponent as MarkdownIndicatorIcon} from '../assets/icons/kg-indicator-markdown.svg';
import {MarkdownNodeComponent} from './MarkdownNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_MARKDOWN_COMMAND = createCommand();

export class MarkdownNode extends BaseMarkdownNode {
    static kgMenu = {
        label: 'Markdown',
        desc: 'Insert a Markdown editor card',
        Icon: MarkdownCardIcon,
        insertCommand: INSERT_MARKDOWN_COMMAND,
        matches: ['markdown', 'md'],
        priority: 2
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
