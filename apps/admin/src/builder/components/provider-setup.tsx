import {useEffect, useState} from 'react';

import {Button, Input} from '@tryghost/shade/components';
import {Stack, Text} from '@tryghost/shade/primitives';

import type {BuilderProvider} from '@/builder/models/curated-models';

function providerName(provider: BuilderProvider): string {
    return provider === 'openai' ? 'OpenAI' : 'Anthropic';
}

export const ProviderSetup = ({provider, connected, disabled, onSave, onForget}: {
    provider: BuilderProvider;
    connected: boolean;
    disabled?: boolean;
    onSave: (provider: BuilderProvider, key: string) => void;
    onForget: (provider: BuilderProvider) => void;
}) => {
    const [key, setKey] = useState('');
    const name = providerName(provider);

    useEffect(() => setKey(''), [provider]);

    if (connected) {
        return (
            <Button disabled={disabled} size='sm' type='button' variant='ghost' onClick={() => onForget(provider)}>
                Forget {name} key
            </Button>
        );
    }

    return (
        <Stack className='rounded-lg border border-border-default bg-surface-elevated p-3' gap='sm'>
            <Text weight='medium'>Connect {name}</Text>
            <Text size='sm' tone='secondary'>Your API key stays in this Admin tab and is cleared when the session ends.</Text>
            <Input
                aria-label={`${name} API key`}
                autoComplete='off'
                disabled={disabled}
                placeholder={`${name} API key`}
                type='password'
                value={key}
                onChange={event => setKey(event.target.value)}
            />
            <Button className='w-full' disabled={disabled || !key.trim()} type='button' onClick={() => {
                    onSave(provider, key.trim());
                    setKey('');
                }}>
                Use {name} key for this session
            </Button>
        </Stack>
    );
};
