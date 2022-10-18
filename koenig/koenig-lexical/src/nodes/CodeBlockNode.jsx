import * as React from 'react';
import {
    $getNodeByKey,
    createCommand,
    DecoratorNode
} from 'lexical';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import {CodeBlockCard} from '../components/ui/cards/CodeBlockCard';

export const CODE_BLOCK_COMMAND = createCommand();

function CodeBlockComponent({code, language, nodeKey, editor}) {
    const updateCode = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCode(event.target.value);
        });
    };

    const updateLanguage = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLanguage(event.target.value);
        });
    };

    return (
        <CodeBlockCard
            code={code}
            updateCode={updateCode}
            language={language}
            updateLanguage={updateLanguage}
        />
    );
}

export class CodeBlockNode extends DecoratorNode {
    __code = '';
    __language = '';

    static getType() {
        return 'codeblock';
    }

    static clone(node) {
        return new CodeBlockNode(node.__key, node.__code);
    }

    static importJSON(serializedNode) {
        return $createCodeBlockNode();
    }

    exportJSON() {
        return {
            type: 'codeblock',
            version: 1,
            code: this.__code,
            language: this.__language
        };
    }

    constructor(language, initCode, key) {
        super(key);
        this.__language = language;
        this.__code = initCode;
    }

    createDOM(config) {
        return document.createElement('div');
    }

    updateDOM() {
        return false;
    }

    getCode() {
        const self = this.getLatest();
        return self.__code;
    }

    setCode(code) {
        const self = this.getWritable();
        self.__code = code;
    }

    getLanguage() {
        const self = this.getLatest();
        return self.__language;
    }

    setLanguage(language) {
        const self = this.getWritable();
        self.__language = language;
    }

    getTextContent() {
        const self = this.getLatest();
        return self.__code;
    }

    decorate(editor, config) {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()}>
                <CodeBlockComponent
                    code={this.__code}
                    language={this.__language}
                    nodeKey={this.getKey()}
                    editor={editor}
                />
            </KoenigCardWrapper>
        );
    }

    isInline() {
        return false;
    }
}

export function $createCodeBlockNode(language, initCode) {
    return new CodeBlockNode(language, initCode);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
