import Button from '../../../../admin-x-ds/global/Button';
import React, {ReactNode, useState} from 'react';

export interface APIKeyFieldProps {
    label: string;
    text?: string;
    hint?: ReactNode;
    onRegenerate?: () => void;
}

const APIKeyField: React.FC<APIKeyFieldProps> = ({label, text = '', hint, onRegenerate}) => {
    const [copied, setCopied] = useState(false);

    const copyText = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return <>
        <div className='p-0 pr-4 text-sm text-grey-600 md:py-1'>{label}</div>
        <div className='group/api-keys relative mb-3 overflow-hidden rounded py-1 text-sm hover:bg-grey-50 dark:hover:bg-grey-900 md:mb-0 md:p-1'>
            {text}
            {hint}
            <div className='visible absolute right-0 top-[50%] flex translate-y-[-50%] gap-1 bg-white pl-1 text-sm group-hover/api-keys:visible dark:bg-black md:invisible'>
                {onRegenerate && <Button color='outline' label='Regenerate' size='sm' onClick={onRegenerate} />}
                <Button color='outline' label={copied ? 'Copied' : 'Copy'} size='sm' onClick={copyText} />
            </div>
        </div>
    </>;
};

const APIKeys: React.FC<{keys: APIKeyFieldProps[]}> = ({keys}) => {
    return (
        <div className='grid grid-cols-1 md:grid-cols-[max-content_1fr]'>
            {keys.map(key => <APIKeyField key={key.label} {...key} />)}
        </div>
    );
};

export default APIKeys;
