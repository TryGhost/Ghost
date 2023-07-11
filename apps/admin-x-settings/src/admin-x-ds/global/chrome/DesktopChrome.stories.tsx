import type {Meta, StoryObj} from '@storybook/react';

import DesktopChrome from './DesktopChrome';

const meta = {
    title: 'Global / Chrome / Desktop Chrome',
    component: DesktopChrome,
    tags: ['autodocs'],
    decorators: [(_story: any) => (<div style={{padding: '40px', backgroundColor: '#efefef', display: 'flex', justifyContent: 'center'}}>{_story()}</div>)]
} satisfies Meta<typeof DesktopChrome>;

export default meta;
type Story = StoryObj<typeof DesktopChrome>;

export const Default: Story = {
    args: {
        children: (
            <div className='bg-white p-4'>
                <p className='mb-6'>This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. </p>

                <img alt='Testimage' className='mb-6' src='https://images.unsplash.com/photo-1685374156924-5230519f4ab3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8YWxsfDI1fHx8fHx8Mnx8MTY4NTYzNzE3M3w&ixlib=rb-4.0.3&q=80&w=2000' />

                <p className='mb-6'>This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. This is a desktop chrome with lots of text. </p>
            </div>
        )
    }
};
