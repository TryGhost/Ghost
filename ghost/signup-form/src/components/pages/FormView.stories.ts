import type {Meta, StoryObj} from '@storybook/react';

import {FormView} from './FormView';

const meta = {
    title: 'Form View',
    component: FormView
} satisfies Meta<typeof FormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {
    args: {
        title: 'Signup Forms Weekly',
        description: 'An independent publication about embeddable signup forms.',
        logo: 'https://user-images.githubusercontent.com/65487235/157884383-1b75feb1-45d8-4430-b636-3f7e06577347.png',
        loading: false,
        error: '',
        isMinimal: false,
        onSubmit: () => {}
    }
};

export const Minimal: Story = {
    args: {
        loading: false,
        error: '',
        isMinimal: true,
        onSubmit: () => {}
    }
};
