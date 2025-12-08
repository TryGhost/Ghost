import type {Meta, StoryObj} from '@storybook/react';

import SettingSectionHeader from './setting-section-header';

const meta = {
    title: 'Settings / Setting Section / Header',
    component: SettingSectionHeader,
    tags: ['autodocs']
} satisfies Meta<typeof SettingSectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Section header'
    }
};
