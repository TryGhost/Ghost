import React, {type ReactNode} from 'react';
import {Button, CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue} from '@tryghost/shade/components';
import {Stack} from '@tryghost/shade/primitives';

export interface APIKeyFieldProps {
    id: string;
    label?: string;
    text?: string;
    hint?: ReactNode;
    onRegenerate?: () => void;
}

const APIKeyField: React.FC<APIKeyFieldProps> = ({id, label, text = '', hint, onRegenerate}) => {
    return (
        <CopyField className='mb-3' data-testid={id} value={text}>
            {label && <CopyFieldLabel>{label}</CopyFieldLabel>}
            <CopyFieldContent>
                <Stack className='min-w-0' gap='none'>
                    <CopyFieldValue />
                    {hint}
                </Stack>
                <CopyFieldActions>
                    {onRegenerate && <Button size='sm' type='button' variant='outline' onClick={onRegenerate}>Regenerate</Button>}
                    <CopyFieldCopyButton />
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    );
};

const APIKeys: React.FC<{hasLabel?: boolean; keys: APIKeyFieldProps[];}> = ({keys}) => {
    return (
        <Stack data-testid='api-keys' gap='none'>
            {keys.map(key => <APIKeyField key={key.id} {...key} />)}
        </Stack>
    );
};

export default APIKeys;
