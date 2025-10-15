import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    CheckIcon,
    CreditCardIcon,
    InfoIcon,
    MailIcon,
    SearchIcon,
    StarIcon,
    LoaderIcon,
    X,
    Copy
} from 'lucide-react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea
} from './input-group';

const meta = {
    title: 'Components/Input Group',
    component: InputGroup,
    parameters: {
        docs: {
            description: {
                component: 'Display additional information or actions alongside an input or textarea. Use addons to provide context, actions, or keyboard shortcuts that enhance the input experience.'
            }
        }
    },
    tags: ['autodocs']
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Icon: Story = {
    render: () => (
        <div className="grid w-full max-w-sm gap-6">
            <InputGroup>
                <InputGroupInput placeholder="Search..." />
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput placeholder="Enter your email" type="email" />
                <InputGroupAddon>
                    <MailIcon />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput placeholder="Card number" />
                <InputGroupAddon>
                    <CreditCardIcon />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                    <CheckIcon />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput placeholder="Card number" />
                <InputGroupAddon align="inline-end">
                    <StarIcon />
                    <InfoIcon />
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Display icons alongside inputs.'
            }
        }
    }
};

export const Text: Story = {
    render: () => (
        <div className="grid w-full max-w-sm gap-6">
            <InputGroup>
                <InputGroupAddon>
                    <InputGroupText>$</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="0.00" />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>USD</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupAddon>
                    <InputGroupText>https://</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput className="!pl-0.5" placeholder="example.com" />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>.com</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput placeholder="Enter your username" />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>@company.com</InputGroupText>
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupTextarea placeholder="Enter your message" />
                <InputGroupAddon align="block-end">
                    <InputGroupText className="text-xs text-muted-foreground">
                        120 characters left
                    </InputGroupText>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Display additional text information alongside inputs.'
            }
        }
    }
};

export const Button: Story = {
    render: () => (
        <div className="grid w-full max-w-sm gap-6">
            <InputGroup>
                <InputGroupInput placeholder="https://x.com/shadcn" readOnly />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        aria-label="Copy"
                        size="icon-xs"
                        title="Copy"
                    >
                        <Copy />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput defaultValue="sk_live_abc123..." placeholder="API key" type="text" />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs">
                        <Copy />
                    </InputGroupButton>
                    <InputGroupButton size="icon-xs">
                        <X />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Add interactive buttons for actions like copy, clear, or submit.'
            }
        }
    }
};

export const Textarea: Story = {
    render: () => (
        <div className="grid w-full max-w-md gap-4">
            <InputGroup>
                <InputGroupTextarea
                    className="min-h-[200px]"
                    placeholder="console.log('Hello, world!');"
                />
                <InputGroupAddon align="block-end" className="border-t">
                    <InputGroupText>Line 1, Column 1</InputGroupText>
                    <InputGroupButton className="ml-auto" size="sm" variant="default">
                        Run
                    </InputGroupButton>
                </InputGroupAddon>
                <InputGroupAddon align="block-start" className="border-b">
                    <InputGroupText className="font-mono font-medium">
                        script.js
                    </InputGroupText>
                    <InputGroupButton className="ml-auto" size="icon-xs">
                        <LoaderIcon />
                    </InputGroupButton>
                    <InputGroupButton size="icon-xs" variant="ghost">
                        <Copy />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Textarea with block-aligned addons for multi-line inputs.'
            }
        }
    }
};

export const Spinner: Story = {
    render: () => (
        <div className="grid w-full max-w-sm gap-4">
            <InputGroup data-disabled="true">
                <InputGroupInput placeholder="Searching..." disabled />
                <InputGroupAddon align="inline-end">
                    <LoaderIcon className="animate-spin" />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup data-disabled="true">
                <InputGroupInput placeholder="Processing..." disabled />
                <InputGroupAddon>
                    <LoaderIcon className="animate-spin" />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup data-disabled="true">
                <InputGroupInput placeholder="Saving changes..." disabled />
                <InputGroupAddon align="inline-end">
                    <InputGroupText>Saving...</InputGroupText>
                    <LoaderIcon className="animate-spin" />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup data-disabled="true">
                <InputGroupInput placeholder="Refreshing data..." disabled />
                <InputGroupAddon>
                    <LoaderIcon className="animate-spin" />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                    <InputGroupText className="text-muted-foreground">
                        Please wait...
                    </InputGroupText>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Display loading spinners alongside inputs during async operations.'
            }
        }
    }
};

export const ErrorState: Story = {
    render: () => (
        <div className="grid w-full max-w-sm gap-4">
            <InputGroup>
                <InputGroupAddon>
                    <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                    aria-invalid="true"
                    defaultValue="invalid-email"
                    placeholder="email@example.com"
                />
            </InputGroup>
            <InputGroup>
                <InputGroupInput
                    aria-invalid="true"
                    defaultValue="invalid url"
                    placeholder="https://example.com"
                />
                <InputGroupAddon align="inline-end">
                    <InfoIcon />
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Error state indicated by aria-invalid attribute. The entire group displays error styling for clear feedback.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <InputGroup data-disabled="true">
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput placeholder="Disabled input" disabled />
            </InputGroup>

            <InputGroup data-disabled="true">
                <InputGroupInput defaultValue="Disabled with value" disabled />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" disabled>
                        <Copy />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled state reduces opacity across all group elements. Add data-disabled="true" to the InputGroup for consistent styling.'
            }
        }
    }
};
