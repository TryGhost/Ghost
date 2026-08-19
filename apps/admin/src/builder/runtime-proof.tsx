import {useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Box, Inline, Stack, Text} from '@tryghost/shade/primitives';

import type {BuilderProvider} from './models/curated-models';
import {runBrowserRuntimeProof} from './core/runtime-proof';

const RuntimeProof = () => {
    const [result, setResult] = useState('Ready');

    const runProof = async (provider: BuilderProvider) => {
        setResult('Running');
        try {
            setResult(await runBrowserRuntimeProof(provider));
        } catch (error) {
            setResult(error instanceof Error ? error.message : 'Proof failed');
        }
    };

    return (
        <Box className='size-full bg-background' padding='lg'>
            <Stack gap='md'>
                <Text as='h1' size='xl' weight='semibold'>Pi browser proof</Text>
                <Inline gap='sm'>
                    <Button type='button' onClick={() => void runProof('openai')}>Run OpenAI proof</Button>
                    <Button type='button' variant='outline' onClick={() => void runProof('anthropic')}>Run Anthropic proof</Button>
                </Inline>
                <Text data-testid='pi-proof-result'>{result}</Text>
            </Stack>
        </Box>
    );
};

export default RuntimeProof;
