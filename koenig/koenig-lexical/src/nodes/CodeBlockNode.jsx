import * as React from 'react';
import {CodeBlockNode as BaseCodeBlockNode} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {CodeBlockCard} from '../components/ui/cards/CodeBlockCard';

// re-export here so we don't need to import from multiple places throughout the app
export {CODE_BLOCK_COMMAND} from '@tryghost/kg-default-nodes';

export class CodeBlockNode extends BaseCodeBlockNode {
    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <CodeBlockCard
                    nodeKey={this.getKey()}
                    code={this.__code}
                    updateCode={event => this.setCode(event.target.value)}
                    language={this.__language}
                    updateLanguage={event => this.setLanguage(event.target.value)}
                    //isEditing={cardContext.isEditing}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createCodeBlockNode(language, initCode, caption) {
    return new CodeBlockNode(language, initCode, caption);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
