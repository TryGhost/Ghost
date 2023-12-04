import type {Meta, StoryObj} from '@storybook/react';

import Toggle from './Toggle';
import ToggleGroup from './ToggleGroup';
import {ReactNode} from 'react';

const meta = {
    title: 'Global / Form / Toggle Group',
    decorators: [(_story: () => ReactNode) => (<div style={{maxWidth: '400px'}}>{_story()}</div>)],
    component: ToggleGroup,
    tags: ['autodocs']
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {
    args: {
        children: <>
            <Toggle direction='rtl' label='Minci'/>
            <Toggle direction='rtl' label='Conker' />
            <Toggle direction='rtl' label='Kevin' />
        </>
    }
};
