import React from 'react';
import type {Meta, StoryFn} from '@storybook/react-vite';

import {SnippetInput} from './SnippetInput';

const story: Meta<typeof SnippetInput> = {
    title: 'Toolbar/SnippetInput',
    component: SnippetInput,
    parameters: {
        status: {
            type: 'Functional'
        }
    }
};
export default story;

const Template: StoryFn<typeof SnippetInput> = (args) => {
    const [value, setValue] = React.useState(args.value || '');

    return (
        <div className="flex">
            <SnippetInput {...args} value={value} onChange={e => setValue(e.target.value)} />
        </div>
    );
};

export const Empty: StoryFn<typeof SnippetInput> = Template.bind({});
Empty.args = {
    value: ''
};

export const Populated: StoryFn<typeof SnippetInput> = Template.bind({});
Populated.args = {
    value: 'snippet'
};

export const WithList: StoryFn<typeof SnippetInput> = Template.bind({});
WithList.args = {
    value: 'snippet',
    snippets: [
        {
            name: 'snippet1',
            value: 'text for snippet 1'
        },
        {
            name: 'snippet2',
            value: 'text for snippet 2'
        },
        {
            name: 'snippet3',
            value: 'text for snippet 3'
        }
    ]
};
