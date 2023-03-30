import React from 'react';
import TenorSelector from './TenorSelector';
import {tenorConfig} from '../../../demo/utils/tenorConfig';
import {useTenor} from '../../utils/services/tenor.js';

const story = {
    title: 'File Selectors/Tenor',
    component: TenorSelector,
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = (args) => {
    const tenorHook = useTenor({config: tenorConfig});

    return (
        <TenorSelector {...tenorHook} {...args} />
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
