import * as React from 'react';
import {$getNodeByKey, createCommand, DecoratorNode} from 'lexical';
// import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import KoenigCardWrapper from '../components/KoenigCardWrapper';
import useAutoExpandTextArea from '../utils/autoExpandTextArea';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

function CodeBlockComponent({className, code, language, nodeKey, editor}) {
    const el = React.useRef(null);
    useAutoExpandTextArea({el, value: code});
    const updateCode = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCode(event.target.value);
        });
    };

    return (
        <KoenigCardWrapper className={className} nodeKey={nodeKey} >
            <code>
                <textarea
                    ref={el}
                    autoCorrect="off" 
                    autoCapitalize="off" 
                    spellCheck="false" 
                    tabIndex="0"
                    autoFocus
                    className='bg-grey-50 min-h-170 w-full p-3' 
                    value={code} 
                    onChange={updateCode} />
            </code>
        </KoenigCardWrapper>
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
        const codeBlockTheme = config.theme.codeBlock || {};
        const className = {
            base: codeBlockTheme.base || '',
            focus: codeBlockTheme.focus || ''
        };

        return (
            <CodeBlockComponent
                className={className}
                code={this.__code}
                language={this.__language}
                nodeKey={this.getKey()}
                editor={editor}
            />
        );
    }

    isTopLevel() {
        return true;
    }
}

export function $createCodeBlockNode(language, initCode) {
    return new CodeBlockNode(language, initCode);
}

export function $isCodeBlockNode(node) {
    return node instanceof CodeBlockNode;
}
