import {lazy, Suspense} from 'react';

import {Navigate, useSearchParams} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {Box, Stack, Text} from '@tryghost/shade/primitives';

import {BrowserPiModelAccess} from '@/builder/models/browser-pi-model-access';

const unavailableNotice = {
    settingsNotice: {
        message: 'Design Builder is not available on this site.',
        type: 'info'
    }
} as const;

const RuntimeProof = import.meta.env.DEV ? lazy(() => import('./runtime-proof')) : null;
const PreviewRuntimeProof = import.meta.env.DEV ? lazy(() => import('./workspaces/theme/preview/preview-runtime-proof')) : null;

const BuilderRoute = () => {
    const [searchParams] = useSearchParams();
    const {data, isError, isLoading} = useBrowseConfig();
    const isUnavailable = isError || (!isLoading && data?.config.labs?.designBuilder !== true);

    if (isLoading) {
        return null;
    }

    if (isUnavailable) {
        return <Navigate state={unavailableNotice} to='/settings/design' replace />;
    }

    if (RuntimeProof && searchParams.get('proof') === 'pi') {
        return <Suspense fallback={null}><RuntimeProof /></Suspense>;
    }

    if (PreviewRuntimeProof && searchParams.get('proof') === 'preview') {
        return <Suspense fallback={null}><PreviewRuntimeProof /></Suspense>;
    }

    return (
        <Box className='size-full bg-background' data-model-runtime={BrowserPiModelAccess.runtime} padding='lg'>
            <Stack gap='sm'>
                <Text as='h1' size='xl' weight='semibold'>Design Builder</Text>
                <Text tone='secondary'>Build and preview theme changes with AI.</Text>
            </Stack>
        </Box>
    );
};

export default BuilderRoute;
