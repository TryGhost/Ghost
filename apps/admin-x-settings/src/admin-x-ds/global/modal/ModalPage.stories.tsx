import type {Meta, StoryObj} from '@storybook/react';

import ModalPage from './ModalPage';

const meta = {
    title: 'Global / Modal / Modal page contents',
    component: ModalPage,
    tags: ['autodocs']
} satisfies Meta<typeof ModalPage>;

export default meta;
type Story = StoryObj<typeof ModalPage>;

export const Default: Story = {
    args: {
        heading: 'Here\'s a modal page',
        children: <>
            <p>Use this component to in full-width or bleed modals in which you build a complete page (e.g. Theme grid)</p>
        </>
    }
};
