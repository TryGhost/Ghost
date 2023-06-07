import type {Meta, StoryObj} from '@storybook/react';

import StickyFooter from './StickyFooter';

const meta = {
    title: 'Global / Sticky Footer',
    component: StickyFooter,
    tags: ['autodocs'],
    decorators: [(_story: any) => (
        <div style={{
            maxWidth: '600px',
            margin: '0 auto 80px',
            background: '#efefef'
        }}>
            <div style={{
                height: '1500px'
            }}></div>
            {_story()}
        </div>
    )]
} satisfies Meta<typeof StickyFooter>;

export default meta;
type Story = StoryObj<typeof StickyFooter>;

const footerContents = (
    <div className='p-6'>
        Hello sticky footer
    </div>
);

export const Default: Story = {
    args: {
        children: footerContents,
        contentBgColorClass: 'bg-[#efefef]'
    }
};
