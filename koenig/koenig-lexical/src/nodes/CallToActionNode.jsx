import EmailCtaCardIcon from '../assets/icons/kg-card-type-email-cta.svg?react';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {BASIC_NODES} from '../index.js';
import {CallToActionNode as BaseCallToActionNode} from '@tryghost/kg-default-nodes';
import {CallToActionNodeComponent} from './CallToActionNodeComponent';
import {createCommand} from 'lexical';
import {setupNestedEditor} from '../utils/nested-editors';

export const INSERT_CTA_COMMAND = createCommand();

export class CallToActionNode extends BaseCallToActionNode {
    __htmlEditor;
    __htmlEditorInitialState;
    // TODO: Improve the copy of the menu item
    static kgMenu = {
        label: 'Call to Action',
        desc: 'Add a call to action to your post',
        Icon: EmailCtaCardIcon,
        insertCommand: INSERT_CTA_COMMAND,
        matches: ['cta', 'call-to-action'],
        priority: 10,
        shortcut: '/cta',
        isHidden: ({config}) => {
            return !(config?.feature?.contentVisibilityAlpha === true);
        }
    };

    static getType() {
        return 'call-to-action';
    }

    getIcon() {
        return EmailCtaCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        // set up nested editor instances
        setupNestedEditor(this, '__htmlEditor', {editor: dataset.htmlEditor, nodes: BASIC_NODES});
    }

    decorate() {
        return (
            <KoenigCardWrapper
                nodeKey={this.getKey()}
                wrapperStyle={this.backgroundColor === 'none' ? 'wide' : 'regular'}
            >
                <CallToActionNodeComponent
                    backgroundColor={this.backgroundColor}
                    buttonColor={this.buttonColor}
                    buttonText={this.buttonText}
                    buttonTextColor={this.buttonTextColor}
                    buttonUrl={this.buttonUrl}
                    hasImage={this.hasImage}
                    hasSponsorLabel={this.hasSponsorLabel}
                    htmlEditor={this.__htmlEditor}
                    imageUrl={this.imageUrl}
                    layout={this.layout}
                    nodeKey={this.getKey()}
                    showButton={this.showButton}
                    textValue={this.textValue}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createCallToActionNode(dataset) {
    return new CallToActionNode(dataset);
}

export function $isCallToActionNode(node) {
    return node instanceof CallToActionNode;
}
