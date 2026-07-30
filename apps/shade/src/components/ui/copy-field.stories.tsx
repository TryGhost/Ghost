import type {Meta, StoryObj} from '@storybook/react-vite';
import {Button} from './button';
import {CopyField, CopyFieldActions, CopyFieldContent, CopyFieldCopyButton, CopyFieldLabel, CopyFieldValue} from './copy-field';

const meta = {
    title: 'Components / Copy Field',
    component: CopyField,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'A read-only value row with hover-revealed actions and intrinsic clipboard feedback.'
            }
        }
    }
} satisfies Meta<typeof CopyField>;

export default meta;
type Story = StoryObj<typeof CopyField>;

export const Default: Story = {
    render: () => (
        <CopyField value="https://example.com/#/portal/gift">
            <CopyFieldLabel>Shareable link</CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions>
                    <CopyFieldCopyButton>Copy link</CopyFieldCopyButton>
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Use for a copyable value that needs a compact label and clipboard feedback.'
            }
        }
    }
};

export const WithAdditionalAction: Story = {
    render: () => (
        <CopyField value="64f13d728d2c45478062b9b3d19d6f2a">
            <CopyFieldLabel>Admin API key</CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions>
                    <Button size="sm" type="button" variant="outline">Regenerate</Button>
                    <CopyFieldCopyButton />
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Compose other row actions beside the copy action when the value supports more workflows.'
            }
        }
    }
};

export const ActionsVisible: Story = {
    render: () => (
        <CopyField value="https://example.com/#/portal/gift">
            <CopyFieldLabel>Shareable link</CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions className="md:pointer-events-auto md:opacity-100">
                    <CopyFieldCopyButton>Copy link</CopyFieldCopyButton>
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Hovering the value or focusing an action reveals the available controls on larger screens.'
            }
        }
    }
};

export const FocusVisible: Story = {
    render: () => (
        <CopyField value="https://example.com/#/portal/gift">
            <CopyFieldLabel>Shareable link</CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions>
                    <CopyFieldCopyButton autoFocus>Copy link</CopyFieldCopyButton>
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Keyboard focus reveals the actions and retains the button focus ring.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <CopyField value="Unavailable while loading" disabled>
            <CopyFieldLabel>Shareable link</CopyFieldLabel>
            <CopyFieldContent>
                <CopyFieldValue />
                <CopyFieldActions>
                    <CopyFieldCopyButton />
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disable the field while its value is unavailable or must not be copied.'
            }
        }
    }
};
