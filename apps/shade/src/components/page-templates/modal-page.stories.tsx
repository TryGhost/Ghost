import type {Meta, StoryObj} from '@storybook/react-vite';
import {ModalPage} from '@/components/page-templates/modal-page';

const meta = {
    title: 'Page Templates / Modal Page',
    component: ModalPage,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'Content layout for full-width and full-bleed modals that present a complete page.'
            }
        }
    }
} satisfies Meta<typeof ModalPage>;

export default meta;
type Story = StoryObj<typeof ModalPage>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Use inside a full-width or full-bleed modal when its content needs page-level spacing and an optional title.'
            }
        }
    },
    render: () => (
        <ModalPage>
            <ModalPage.Title>Links</ModalPage.Title>
            <p>Use these links in your theme to open pages of Portal.</p>
        </ModalPage>
    )
};
