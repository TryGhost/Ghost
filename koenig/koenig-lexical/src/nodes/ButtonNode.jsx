import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {ButtonNode as BaseButtonNode} from '@tryghost/kg-default-nodes';
import {ReactComponent as ButtonCardIcon} from '../assets/icons/kg-card-type-button.svg';
import {ButtonNodeComponent} from './ButtonNodeComponent';
import {createCommand} from 'lexical';

export const INSERT_BUTTON_COMMAND = createCommand();

export class ButtonNode extends BaseButtonNode {
    static kgMenu = {
        label: 'Button',
        desc: 'Add a button to your post',
        Icon: ButtonCardIcon,
        insertCommand: INSERT_BUTTON_COMMAND,
        matches: ['button'],
        priority: 10
    };

    static getType() {
        return 'button';
    }

    // transient properties used to control node behaviour
    __openInEditMode = false;

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {_openInEditMode} = dataset;
        this.__openInEditMode = _openInEditMode || false;
    }

    getIcon() {
        return ButtonCardIcon;
    }

    clearOpenInEditMode() {
        const self = this.getWritable();
        self.__openInEditMode = false;
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                openInEditMode={this.__openInEditMode}
                wrapperStyle="wide"
            >
                <ButtonNodeComponent
                    alignment={this.alignment}
                    buttonText={this.buttonText}
                    buttonUrl={this.buttonUrl}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createButtonNode(dataset) {
    return new ButtonNode(dataset);
}

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
