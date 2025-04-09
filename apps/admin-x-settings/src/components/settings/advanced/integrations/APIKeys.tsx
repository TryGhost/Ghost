import React, {ReactNode, useState} from 'react';
import clsx from 'clsx';
import {Button, Heading} from '@tryghost/admin-x-design-system';

export interface APIKeyFieldProps {
    label?: string;
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

    const containerClasses = clsx(
        'group/api-keys relative -mt-1 mb-1 w-full overflow-hidden border-b border-transparent py-2 hover:border-grey-300 dark:hover:border-grey-600'
    );

    return <div className='mb-3 grid grid-cols-1'>
        {label && <Heading level={6} grey>{label}</Heading>}
        <div className={containerClasses}>
            <span>{text}</span>
            {hint}
            <div className='visible absolute right-0 top-1/2 flex translate-y-[-50%] gap-1 bg-white pl-1 text-sm group-hover/api-keys:visible md:invisible dark:bg-black'>
                {onRegenerate && <Button color='outline' label='Regenerate' size='sm' onClick={onRegenerate} />}
                <Button color='outline' label={copied ? 'Copied' : 'Copy'} size='sm' onClick={copyText} />
            </div>
        </div>
    </div>;
};

const APIKeys: React.FC<{hasLabel?: boolean; keys: APIKeyFieldProps[];}> = ({keys}) => {
    return (
        <div data-testid='api-keys'>
            {keys.map(key => <APIKeyField key={key.label} {...key} />)}
        </div>
    );
};

export default APIKeys;
