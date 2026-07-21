import type {Meta, StoryObj} from '@storybook/react-vite';
import * as React from 'react';

import {Field, FieldContent, FieldDescription, FieldLabel} from './field';
import {RadioGroup, RadioGroupItem} from './radio-group';

const meta = {
    title: 'Components / Radio Group',
    component: RadioGroup,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'A set of mutually exclusive options built on the Radix UI Radio Group primitive.'
            }
        }
    }
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
    render: () => (
        <RadioGroup defaultValue="comfortable">
            <Field orientation="horizontal">
                <RadioGroupItem id="default" value="default" />
                <FieldLabel htmlFor="default">Default</FieldLabel>
            </Field>
            <Field orientation="horizontal">
                <RadioGroupItem id="comfortable" value="comfortable" />
                <FieldLabel htmlFor="comfortable">Comfortable</FieldLabel>
            </Field>
            <Field orientation="horizontal">
                <RadioGroupItem id="compact" value="compact" />
                <FieldLabel htmlFor="compact">Compact</FieldLabel>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use for a short list where exactly one option can be selected.'
            }
        }
    }
};

export const WithDescriptions: Story = {
    render: () => (
        <RadioGroup defaultValue="weekly">
            <Field orientation="horizontal">
                <RadioGroupItem id="weekly" value="weekly" />
                <FieldContent>
                    <FieldLabel htmlFor="weekly">Weekly digest</FieldLabel>
                    <FieldDescription>Receive one summary every week.</FieldDescription>
                </FieldContent>
            </Field>
            <Field orientation="horizontal">
                <RadioGroupItem id="daily" value="daily" />
                <FieldContent>
                    <FieldLabel htmlFor="daily">Daily digest</FieldLabel>
                    <FieldDescription>Receive a summary each day.</FieldDescription>
                </FieldContent>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Pair items with Field content when each option needs supporting text.'
            }
        }
    }
};

export const CheckIndicator: Story = {
    render: () => (
        <RadioGroup defaultValue="free-months">
            <Field orientation="horizontal">
                <RadioGroupItem id="percentage-discount" indicator="check" value="percentage-discount" />
                <FieldContent>
                    <FieldLabel htmlFor="percentage-discount">Percentage discount</FieldLabel>
                    <FieldDescription>Offer a special reduced price.</FieldDescription>
                </FieldContent>
            </Field>
            <Field orientation="horizontal">
                <RadioGroupItem id="free-months" indicator="check" value="free-months" />
                <FieldContent>
                    <FieldLabel htmlFor="free-months">Free month(s)</FieldLabel>
                    <FieldDescription>Give free access for a limited time.</FieldDescription>
                </FieldContent>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use the check indicator when preserving an established checked-circle treatment for a mutually exclusive choice.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <RadioGroup defaultValue="enabled">
            <Field orientation="horizontal">
                <RadioGroupItem id="enabled" value="enabled" />
                <FieldLabel htmlFor="enabled">Enabled option</FieldLabel>
            </Field>
            <Field data-disabled="true" orientation="horizontal">
                <RadioGroupItem id="disabled" value="disabled" disabled />
                <FieldLabel htmlFor="disabled">Disabled option</FieldLabel>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled options remain visible but cannot receive selection.'
            }
        }
    }
};

export const Hover: Story = {
    render: () => (
        <RadioGroup>
            <Field orientation="horizontal">
                <RadioGroupItem className="bg-interactive-hover" id="hovered" value="hovered" />
                <FieldLabel htmlFor="hovered">Hovered option</FieldLabel>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Hover gives enabled options an interactive surface treatment.'
            }
        }
    }
};

export const Invalid: Story = {
    render: () => (
        <RadioGroup>
            <Field orientation="horizontal">
                <RadioGroupItem id="invalid" value="invalid" aria-invalid />
                <FieldLabel htmlFor="invalid">Invalid option</FieldLabel>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Invalid options use the shared form-control error treatment.'
            }
        }
    }
};

export const FocusVisible: Story = {
    render: () => (
        <RadioGroup defaultValue="focused">
            <Field orientation="horizontal">
                <RadioGroupItem id="focused" value="focused" autoFocus />
                <FieldLabel htmlFor="focused">Focused option</FieldLabel>
            </Field>
        </RadioGroup>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Keyboard focus uses the shared form-control focus ring.'
            }
        }
    }
};

export const Controlled: Story = {
    render: () => {
        const [value, setValue] = React.useState('monthly');

        return (
            <RadioGroup value={value} onValueChange={setValue}>
                <Field orientation="horizontal">
                    <RadioGroupItem id="monthly" value="monthly" />
                    <FieldLabel htmlFor="monthly">Monthly</FieldLabel>
                </Field>
                <Field orientation="horizontal">
                    <RadioGroupItem id="yearly" value="yearly" />
                    <FieldLabel htmlFor="yearly">Yearly</FieldLabel>
                </Field>
            </RadioGroup>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Use a controlled value when selection is stored in application state.'
            }
        }
    }
};
