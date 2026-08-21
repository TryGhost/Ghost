import {useEffect, useState} from 'react';

import {Button, Input} from '@tryghost/shade/components';
import {Stack, Text} from '@tryghost/shade/primitives';

import {codexAccessTokenFromAuthJson} from '@/builder/models/codex-auth';

import type {BuilderProvider} from '@/builder/models/curated-models';
import type {Ref} from 'react';

function providerName(provider: BuilderProvider): string {
    if (provider === 'openai') {
        return 'OpenAI';
    }
    return provider === 'openai-codex' ? 'Codex' : 'Anthropic';
}

export const ProviderSetup = ({provider, connected, disabled, inputRef, onSave, onForget}: {
    provider: BuilderProvider;
    connected: boolean;
    disabled?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    onSave: (provider: BuilderProvider, key: string) => void;
    onForget: (provider: BuilderProvider) => void;
}) => {
    const [key, setKey] = useState('');
    const [error, setError] = useState<string | null>(null);
    const name = providerName(provider);
    const isCodex = provider === 'openai-codex';

    useEffect(() => {
        setKey('');
        setError(null);
    }, [provider]);

    if (connected) {
        return (
            <Button disabled={disabled} size='sm' type='button' variant='ghost' onClick={() => onForget(provider)}>
                {isCodex ? 'Forget Codex session' : `Forget ${name} key`}
            </Button>
        );
    }

    return (
        <Stack className='builder-raised-surface rounded-lg bg-surface-elevated p-3' gap='sm'>
            <Text weight='medium'>Connect {name}</Text>
            <Text size='sm' tone='secondary'>
                {isCodex
                    ? 'Paste auth.json from your Codex session. Only its access token stays in this Admin tab and is cleared when the session ends.'
                    : 'Your API key stays in this Admin tab and is cleared when the session ends.'}
            </Text>
            <Input
                ref={inputRef}
                aria-invalid={Boolean(error)}
                aria-label={isCodex ? 'Codex auth.json' : `${name} API key`}
                autoComplete='off'
                disabled={disabled}
                placeholder={isCodex ? 'Paste Codex auth.json' : `${name} API key`}
                type='password'
                value={key}
                onChange={(event) => {
                    setKey(event.target.value);
                    setError(null);
                }}
            />
            {error && <Text className='text-destructive' role='alert' size='sm'>{error}</Text>}
            <Button className='w-full' disabled={disabled || !key.trim()} type='button' onClick={() => {
                    try {
                        const credential = isCodex ? codexAccessTokenFromAuthJson(key) : key.trim();
                        onSave(provider, credential);
                        setKey('');
                        setError(null);
                    } catch (saveError) {
                        setError(saveError instanceof Error ? saveError.message : 'Could not use that credential.');
                    }
                }}>
                {isCodex ? 'Use Codex session' : `Use ${name} key for this session`}
            </Button>
        </Stack>
    );
};
