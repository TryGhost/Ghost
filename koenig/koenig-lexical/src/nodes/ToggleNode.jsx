import KoenigCardWrapper from '../components/KoenigCardWrapper';
import React from 'react';
import {ToggleNode as BaseToggleNode, INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';
import {ReactComponent as ToggleCardIcon} from '../assets/icons/kg-card-type-toggle.svg';
import {ToggleNodeComponent} from './ToggleNodeComponent';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_TOGGLE_COMMAND} from '@tryghost/kg-default-nodes';

export class ToggleNode extends BaseToggleNode {
    static kgMenu = [{
        label: 'Toggle',
        desc: 'Add collapsible content',
        Icon: ToggleCardIcon,
        insertCommand: INSERT_TOGGLE_COMMAND,
        matches: ['toggle', 'collapse']
    }];

    getIcon() {
        return ToggleCardIcon;
    }

    createDOM() {
        return document.createElement('div');
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <ToggleNodeComponent
                    content={this.__content}
                    header={this.__header}
                    nodeKey={this.getKey()}
                />
            </KoenigCardWrapper>
        );
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
