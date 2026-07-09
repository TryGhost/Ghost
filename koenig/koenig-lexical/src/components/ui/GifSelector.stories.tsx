import GifSelector from './GifSelector';
import {getGifProviderConfig, useGif} from '../../utils/services/gif.js';
import {klipyConfig} from '../../../demo/utils/gifConfig';

const story = {
    title: 'File Selectors/Gif',
    component: GifSelector,
    parameters: {
        status: {
            type: 'Functional'
        }
    }
};
export default story;

const Template = (args) => {
    const gifHook = useGif({config: getGifProviderConfig({klipy: klipyConfig})});

    return (
        <GifSelector {...gifHook} {...args} />
    );
};

export const Base = Template.bind({});
Base.args = {
    config: klipyConfig
};

export const Loading = Template.bind({});
Loading.args = {
    config: klipyConfig,
    isLoading: true,
    isLazyLoading: false
};

export const LazyLoading = Template.bind({});
LazyLoading.args = {
    config: klipyConfig,
    isLoading: true,
    isLazyLoading: true,
    loadNextPage: () => {}
};

export const ErrorCommon = Template.bind({});
ErrorCommon.args = {
    config: klipyConfig,
    error: 'common'
};

export const ErrorInvalidKey = Template.bind({});
ErrorInvalidKey.args = {
    config: klipyConfig,
    error: 'invalid_key'
};

export const ErrorSpecific = Template.bind({});
ErrorSpecific.args = {
    config: klipyConfig,
    error: 'Something went wrong'
};
