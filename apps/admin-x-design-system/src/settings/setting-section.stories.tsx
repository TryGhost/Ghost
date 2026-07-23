import {ReactNode} from 'react';
import type {Meta, StoryObj} from '@storybook/react-vite';

import SettingSection from './setting-section';

const meta = {
    title: 'Settings / Setting Section',
    component: SettingSection,
    tags: ['autodocs'],
    decorators: [(_story: () => ReactNode) => <div style={{maxWidth: '780px'}}>{_story()}</div>]
} satisfies Meta<typeof SettingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        title: 'Section header',
        children: <p>Setting groups render in this section.</p>
    }
};
