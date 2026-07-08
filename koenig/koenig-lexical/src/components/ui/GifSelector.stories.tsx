import GifSelector from './GifSelector';
import {getGifProviderConfig, useGif} from '../../utils/services/gif.js';
import {tenorConfig} from '../../../demo/utils/gifConfig';

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
    const gifHook = useGif({config: getGifProviderConfig({tenor: tenorConfig})});

    return (
        <GifSelector {...gifHook} {...args} />
    );
};

export const Base = Template.bind({});
Base.args = {
    config: tenorConfig
};

export const Loading = Template.bind({});
Loading.args = {
    config: tenorConfig,
    isLoading: true,
    isLazyLoading: false
};

export const LazyLoading = Template.bind({});
LazyLoading.args = {
    config: tenorConfig,
    isLoading: true,
    isLazyLoading: true,
    loadNextPage: () => {}
};

export const ErrorCommon = Template.bind({});
ErrorCommon.args = {
    config: tenorConfig,
    error: 'common'
};

export const ErrorInvalidKey = Template.bind({});
ErrorInvalidKey.args = {
    config: tenorConfig,
    error: 'invalid_key'
};

export const ErrorSpecific = Template.bind({});
ErrorSpecific.args = {
    config: tenorConfig,
    error: 'Something went wrong'
};
