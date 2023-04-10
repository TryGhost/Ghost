import React from 'react';

import {SnippetInput} from './SnippetInput';

const story = {
    title: 'Toolbar/SnippetInput',
    component: SnippetInput,
    parameters: {
        status: {
            type: 'inProgress'
        }
    }
};
export default story;

const Template = (args) => {
    const [value, setValue] = React.useState(args.value || '');

    return (
        <div className="flex">
            <SnippetInput {...args} value={value} onChange={e => setValue(e.target.value)} />
        </div>
    );
};

export const Empty = Template.bind({});
Empty.args = {
    value: ''
};

export const Populated = Template.bind({});
Populated.args = {
    value: 'snippet'
};

export const WithList = Template.bind({});
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
