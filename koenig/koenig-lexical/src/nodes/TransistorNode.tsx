import KoenigCardWrapper from '../components/KoenigCardWrapper';
import TransistorIcon from '../assets/icons/kg-card-type-transistor.svg?react';
import {TransistorNode as BaseTransistorNode, type TransistorData} from '@tryghost/kg-default-nodes';
import {TransistorNodeComponent} from './TransistorNodeComponent';
import {createCommand} from 'lexical';
import type {CardMenuItem} from '../utils/buildCardMenu';
import type {LexicalCommand} from 'lexical';

export const INSERT_TRANSISTOR_COMMAND: LexicalCommand<TransistorData> = createCommand();

export class TransistorNode extends BaseTransistorNode {
    static kgMenu: CardMenuItem[] = [{
        section: 'Embeds',
        label: 'Transistor',
        desc: 'Embed a Transistor podcast player',
        Icon: TransistorIcon,
        insertCommand: INSERT_TRANSISTOR_COMMAND,
        matches: ['transistor', 'podcast'],
        priority: 2,
        shortcut: '/transistor',
        isHidden: ({config}: {config?: Record<string, unknown>}) => {
            return !((config?.feature as Record<string, unknown> | undefined)?.transistor === true);
        }
    }];

    constructor(dataset: TransistorData = {}, key?: string) {
        super(dataset, key);
    }

    getIcon() {
        return TransistorIcon;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} wrapperStyle="regular">
                <TransistorNodeComponent
                    accentColor={this.accentColor}
                    backgroundColor={this.backgroundColor}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createTransistorNode(dataset: TransistorData) {
    return new TransistorNode(dataset);
}

export function $isTransistorNode(node: unknown): node is TransistorNode {
    return node instanceof TransistorNode;
}
