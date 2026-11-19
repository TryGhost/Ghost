import HtmlCardIcon from '../assets/icons/kg-card-type-html.svg?react';
import HtmlIndicatorIcon from '../assets/icons/kg-indicator-html.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {HtmlNode as BaseHtmlNode, type HtmlData} from '@tryghost/kg-default-nodes';
import {HtmlNodeComponent} from './HtmlNodeComponent';
import {createCommand} from 'lexical';
import type {CardMenuItem} from '../utils/buildCardMenu';
import type {LexicalCommand} from 'lexical';

export const INSERT_HTML_COMMAND: LexicalCommand<HtmlData> = createCommand();

export class HtmlNode extends BaseHtmlNode {
    static kgMenu: CardMenuItem = {
        label: 'HTML',
        desc: 'Insert a HTML editor card',
        Icon: HtmlCardIcon,
        insertCommand: INSERT_HTML_COMMAND,
        matches: ['html'],
        priority: 18,
        shortcut: '/html'
    };

    getIcon() {
        return HtmlCardIcon;
    }

    constructor(dataset: HtmlData = {}, key?: string) {
        super(dataset, key);
    }

    decorate() {
        return (
            <KoenigCardWrapper
                IndicatorIcon={HtmlIndicatorIcon}
                nodeKey={this.getKey()}
                wrapperStyle="wide"
            >
                <HtmlNodeComponent
                    html={this.html}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createHtmlNode(dataset: HtmlData) {
    return new HtmlNode(dataset);
}

export function $isHtmlNode(node: unknown): node is HtmlNode {
    return node instanceof HtmlNode;
}
