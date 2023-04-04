import React from 'react';

import {UrlInput} from './UrlInput';

const story = {
    title: 'Generic/URL Input',
    component: UrlInput,
    parameters: {
        status: {
            type: 'uiReady'
        }
    }
};
export default story;

const Template = args => (
    <div className="w-[240px]">
        <UrlInput {...args} />
    </div>
);

export const Empty = Template.bind({});
Empty.args = {
    value: '',
    onChange: () => {}
};

export const Loading = Template.bind({});
Loading.args = {
    value: 'https://ghost.org/',
    onChange: () => {},
    isLoading: true
};

export const Placeholder = Template.bind({});
Placeholder.args = {
    value: '',
    onChange: () => {},
    placeholder: 'Enter a URL to add content...'
};

export const Populated = Template.bind({});
Populated.args = {
    value: 'https://sampleurl.com',
    onChange: () => {}
};

export const Error = Template.bind({});
Error.args = {
    value: 'thisisntaurl',
    hasError: true,
    onChange: () => {},
    handleRetry: () => {},
    handlePasteAsLink: () => {}
};