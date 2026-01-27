import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import TransistorIcon from '../assets/icons/kg-card-type-transistor.svg?react';
import {TransistorNode as BaseTransistorNode} from '@tryghost/kg-default-nodes';
import {TransistorNodeComponent} from './TransistorNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_TRANSISTOR_COMMAND = createCommand();

export class TransistorNode extends BaseTransistorNode {
    static kgMenu = [{
        label: 'Transistor',
        desc: 'Embed a Transistor podcast player',
        Icon: TransistorIcon,
        insertCommand: INSERT_TRANSISTOR_COMMAND,
        matches: ['transistor', 'podcast'],
        priority: 8,
        shortcut: '/transistor',
        isHidden: ({config}) => {
            return !(config?.feature?.transistor === true);
        }
    }];

    constructor(dataset = {}, key) {
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

export function $createTransistorNode(dataset) {
    return new TransistorNode(dataset);
}

export function $isTransistorNode(node) {
    return node instanceof TransistorNode;
}
