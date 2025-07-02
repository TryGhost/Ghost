import type {Meta, StoryObj} from '@storybook/react';

import SortMenu from './SortMenu';

const meta = {
    title: 'Global / SortMenu',
    component: SortMenu,
    tags: ['autodocs']
} satisfies Meta<typeof SortMenu>;

export default meta;
type Story = StoryObj<typeof SortMenu>;

const items = [
    {id: 'date-added', label: 'Date added', selected: true},
    {id: 'name', label: 'Name'},
    {id: 'redemptions', label: 'Redemptions'}
];

export const Default: Story = {
    args: {
        items: items,
        onSortChange: () => {},
        onDirectionChange: () => {},
        position: 'start'
    },
    decorators: [
        ThisStory => (
            <div style={{maxWidth: '100px', margin: '0 auto'}}><ThisStory /></div>
        )
    ]
};
