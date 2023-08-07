import CodeEditor from '../../../../admin-x-ds/global/form/CodeEditor';
import React from 'react';
import {html} from '@codemirror/lang-html';

interface CodeBlockProps {
    hint?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({hint}) => {
    return (
        <div className='flex-column mt-5 flex gap-1'>
            <CodeEditor extensions={[html()]} hint={hint} />
        </div>
    );
};

export default CodeBlock;
