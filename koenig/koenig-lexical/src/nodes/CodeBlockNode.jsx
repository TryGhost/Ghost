import * as React from 'react';
import {CodeBlockNode as BaseCodeBlockNode} from '@tryghost/kg-default-nodes';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {CodeBlockCard} from '../components/ui/cards/CodeBlockCard';
import CardContext from '../context/CardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNodeByKey} from 'lexical';

// re-export here so we don't need to import from multiple places throughout the app
export {INSERT_CODE_BLOCK_COMMAND} from '@tryghost/kg-default-nodes';

function CodeBlockNodeComponent({nodeKey, caption, code, language}) {
    const [editor] = useLexicalComposerContext();
    const cardContext = React.useContext(CardContext);

    const updateCode = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCode(value);
        });
    };

    const updateLanguage = (value) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLanguage(value);
        });
    };

    return (
        <CodeBlockCard
            nodeKey={nodeKey}
            caption={caption}
            code={code}
            updateCode={updateCode}
            language={language}
            updateLanguage={updateLanguage}
            isEditing={cardContext.isEditing}
        />
    );
}

export class CodeBlockNode extends BaseCodeBlockNode {
    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={this.__cardWidth}>
                <CodeBlockNodeComponent
                    nodeKey={this.getKey()}
                    caption={this.__caption}
                    code={this.__code}
                    language={this.__language}
                />
            </KoenigCardWrapper>
        );
    }
}

export function $createCodeBlockNode(dataset) {
    return new CodeBlockNode(dataset);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
