import {Navigate} from '@tryghost/admin-x-framework';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {Box, Stack, Text} from '@tryghost/shade/primitives';

const unavailableNotice = {
    settingsNotice: {
        message: 'Design Builder is not available on this site.',
        type: 'info'
    }
} as const;

const BuilderRoute = () => {
    const {data, isError, isLoading} = useBrowseConfig();
    const isUnavailable = isError || (!isLoading && data?.config.labs?.designBuilder !== true);

    if (isLoading) {
        return null;
    }

    if (isUnavailable) {
        return <Navigate state={unavailableNotice} to='/settings/design' replace />;
    }

    return (
        <Box className='size-full bg-background' padding='lg'>
            <Stack gap='sm'>
                <Text as='h1' size='xl' weight='semibold'>Design Builder</Text>
                <Text tone='secondary'>Build and preview theme changes with AI.</Text>
            </Stack>
        </Box>
    );
};

export default BuilderRoute;
