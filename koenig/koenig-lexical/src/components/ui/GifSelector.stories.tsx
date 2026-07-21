import GifSelector from './GifSelector';
import {getGifProviderConfig, useGif} from '../../utils/services/gif';
import {klipyConfig} from '../../../demo/utils/gifConfig';
import type {Meta, StoryFn} from '@storybook/react-vite';

const story: Meta<typeof GifSelector> = {
    title: 'File Selectors/Gif',
    component: GifSelector,
    parameters: {
        status: {
            type: 'Functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof GifSelector> = (args) => {
    const gifHook = useGif({config: getGifProviderConfig({klipy: klipyConfig})!});

    return (
        <GifSelector {...gifHook} {...args} />
    );
};

export const Base: StoryFn<typeof GifSelector> = Template.bind({});
Base.args = {};

export const Loading: StoryFn<typeof GifSelector> = Template.bind({});
Loading.args = {
    isLoading: true,
    isLazyLoading: false
};

export const LazyLoading: StoryFn<typeof GifSelector> = Template.bind({});
LazyLoading.args = {
    isLoading: true,
    isLazyLoading: true,
    loadNextPage: () => {}
};

export const ErrorCommon: StoryFn<typeof GifSelector> = Template.bind({});
ErrorCommon.args = {
    error: 'common'
};

export const ErrorInvalidKey: StoryFn<typeof GifSelector> = Template.bind({});
ErrorInvalidKey.args = {
    error: 'invalid_key'
};

export const ErrorSpecific: StoryFn<typeof GifSelector> = Template.bind({});
ErrorSpecific.args = {
    error: 'Something went wrong'
};
