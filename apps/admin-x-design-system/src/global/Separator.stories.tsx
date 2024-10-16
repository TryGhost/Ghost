import type {Meta, StoryObj} from '@storybook/react';

import Separator from './Separator';

const meta = {
    title: 'Global / Separator',
    component: Separator,
    tags: ['autodocs']
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {};