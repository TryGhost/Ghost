import React from 'react';
import TextArea from '../../../../admin-x-ds/global/form/TextArea';

interface CodeBlockProps {
    hint?: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({hint}) => {
    return (
        <div className='flex-column mt-5 flex gap-1'>
            <TextArea hint={hint} rows={10} />
        </div>
    );
};

export default CodeBlock;