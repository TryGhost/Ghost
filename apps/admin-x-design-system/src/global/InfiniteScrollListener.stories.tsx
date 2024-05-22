import {useState} from 'react';
import type {Meta, StoryObj} from '@storybook/react';

import InfiniteScrollListener from './InfiniteScrollListener';

const meta = {
    title: 'Global / Infinite scroll listener',
    component: InfiniteScrollListener,
    tags: ['autodocs']
} satisfies Meta<typeof InfiniteScrollListener>;

export default meta;
type Story = StoryObj<typeof InfiniteScrollListener>;

export const Default: Story = {
    args: {
        offset: 250
    },
    render: function Component(args) {
        const [wasTriggered, setTriggered] = useState(false);

        return <div>
            <div>Try scrolling here ... {wasTriggered && <strong>Near the end, time to load the next page!</strong>}</div>
            <div style={{overflow: 'auto', height: '300px'}}>
                <div style={{position: 'relative', height: '2000px', background: 'linear-gradient(to bottom, #000, #fff)'}}>
                    <InfiniteScrollListener {...args} onTrigger={() => setTriggered(true)} />
                </div>
            </div>
        </div>;
    }
};
