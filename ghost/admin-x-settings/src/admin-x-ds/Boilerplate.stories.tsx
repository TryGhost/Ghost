import type {Meta, StoryObj} from '@storybook/react';

import BoilerPlate from './Boilerplate';

const meta = {
    title: 'Meta / Boilerplate story',
    component: BoilerPlate,
    tags: ['autodocs']
} satisfies Meta<typeof BoilerPlate>;

export default meta;
type Story = StoryObj<typeof BoilerPlate>;

export const Default: Story = {
    args: {
        children: 'This is a boilerplate component. Use as a basis to create new components.'
    }
};
