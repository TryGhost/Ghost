import type {Meta, StoryObj} from '@storybook/react';

import React from 'react';
import Breadcrumb, {BreadcrumbItem} from './Breadcrumb';

const meta = {
    title: 'Global / Breadcrumb',
    component: Breadcrumb,
    tags: ['autodocs']
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

export const Default: Story = {
    args: {
        children: (
            <Breadcrumb>
                <BreadcrumbItem>f</BreadcrumbItem>
                <BreadcrumbItem>f</BreadcrumbItem>
                <BreadcrumbItem>f</BreadcrumbItem>
            </Breadcrumb>
        )
    }
};
