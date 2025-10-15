import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
    FieldTitle
} from './field';
import {Input} from './input';
import {Textarea} from './textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './select';
import {Button} from './button';

const meta = {
    title: 'Components / Field',
    component: Field,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Composable form field components for building accessible forms. Provides consistent structure for labels, descriptions, validation messages, and field grouping.'
            }
        }
    },
    decorators: [
        Story => (
            <div style={{padding: '24px'}}>
                <Story />
            </div>
        )
    ]
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteExample: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <form>
                <FieldGroup>
                    <FieldSet>
                        <FieldLegend>Payment Method</FieldLegend>
                        <FieldDescription>
                            All transactions are secure and encrypted
                        </FieldDescription>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                    Name on Card
                                </FieldLabel>
                                <Input
                                    id="checkout-7j9-card-name-43j"
                                    placeholder="Evil Rabbit"
                                    required
                                />
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                    Card Number
                                </FieldLabel>
                                <Input
                                    id="checkout-7j9-card-number-uw1"
                                    placeholder="1234 5678 9012 3456"
                                    required
                                />
                                <FieldDescription>
                                    Enter your 16-digit card number
                                </FieldDescription>
                            </Field>
                            <div className="grid grid-cols-3 gap-4">
                                <Field>
                                    <FieldLabel htmlFor="checkout-exp-month-ts6">
                                        Month
                                    </FieldLabel>
                                    <Select defaultValue="">
                                        <SelectTrigger id="checkout-exp-month-ts6">
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="01">01</SelectItem>
                                            <SelectItem value="02">02</SelectItem>
                                            <SelectItem value="03">03</SelectItem>
                                            <SelectItem value="04">04</SelectItem>
                                            <SelectItem value="05">05</SelectItem>
                                            <SelectItem value="06">06</SelectItem>
                                            <SelectItem value="07">07</SelectItem>
                                            <SelectItem value="08">08</SelectItem>
                                            <SelectItem value="09">09</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="11">11</SelectItem>
                                            <SelectItem value="12">12</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-exp-year-f59">
                                        Year
                                    </FieldLabel>
                                    <Select defaultValue="">
                                        <SelectTrigger id="checkout-7j9-exp-year-f59">
                                            <SelectValue placeholder="YYYY" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2024">2024</SelectItem>
                                            <SelectItem value="2025">2025</SelectItem>
                                            <SelectItem value="2026">2026</SelectItem>
                                            <SelectItem value="2027">2027</SelectItem>
                                            <SelectItem value="2028">2028</SelectItem>
                                            <SelectItem value="2029">2029</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-cvv">CVV</FieldLabel>
                                    <Input id="checkout-7j9-cvv" placeholder="123" required />
                                </Field>
                            </div>
                        </FieldGroup>
                    </FieldSet>
                    <FieldSeparator />
                    <FieldSet>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="checkout-7j9-optional-comments">
                                    Comments
                                </FieldLabel>
                                <Textarea
                                    className="resize-none"
                                    id="checkout-7j9-optional-comments"
                                    placeholder="Add any additional comments"
                                />
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                    <Field orientation="horizontal">
                        <Button type="submit">Submit</Button>
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Field>
                </FieldGroup>
            </form>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Complete form example demonstrating fieldsets, field groups, separators, and horizontal button layout.'
            }
        }
    }
};

export const InputField: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <FieldSet>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="username">Username</FieldLabel>
                        <Input id="username" placeholder="Max Leiter" type="text" />
                        <FieldDescription>
                            Choose a unique username for your account.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <FieldDescription>
                            Must be at least 8 characters long.
                        </FieldDescription>
                        <Input id="password" placeholder="********" type="password" />
                    </Field>
                </FieldGroup>
            </FieldSet>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Basic input fields with labels and descriptions for username and password entry.'
            }
        }
    }
};

export const TextareaField: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <FieldSet>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="feedback">Feedback</FieldLabel>
                        <Textarea
                            id="feedback"
                            placeholder="Your feedback helps us improve..."
                            rows={4}
                        />
                        <FieldDescription>
                            Share your thoughts about our service.
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </FieldSet>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Textarea field for longer text input with description.'
            }
        }
    }
};

export const SelectField: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field>
                <FieldLabel>Department</FieldLabel>
                <Select>
                    <SelectTrigger>
                        <SelectValue placeholder="Choose department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="engineering">Engineering</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="support">Customer Support</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="operations">Operations</SelectItem>
                    </SelectContent>
                </Select>
                <FieldDescription>
                    Select your department or area of work.
                </FieldDescription>
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Select dropdown field with label and description.'
            }
        }
    }
};

export const FieldsetExample: Story = {
    render: () => (
        <div className="w-full max-w-md space-y-6">
            <FieldSet>
                <FieldLegend>Address Information</FieldLegend>
                <FieldDescription>
                    We need your address to deliver your order.
                </FieldDescription>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="street">Street Address</FieldLabel>
                        <Input id="street" placeholder="123 Main St" type="text" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field>
                            <FieldLabel htmlFor="city">City</FieldLabel>
                            <Input id="city" placeholder="New York" type="text" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="zip">Postal Code</FieldLabel>
                            <Input id="zip" placeholder="90502" type="text" />
                        </Field>
                    </div>
                </FieldGroup>
            </FieldSet>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Fieldset with legend grouping related address fields with responsive grid layout.'
            }
        }
    }
};

export const ResponsiveLayout: Story = {
    render: () => (
        <div className="w-full max-w-4xl">
            <form>
                <FieldSet>
                    <FieldLegend>Profile</FieldLegend>
                    <FieldDescription>Fill in your profile information.</FieldDescription>
                    <FieldSeparator />
                    <FieldGroup>
                        <Field orientation="responsive">
                            <FieldContent>
                                <FieldLabel htmlFor="name">Name</FieldLabel>
                                <FieldDescription>
                                    Provide your full name for identification
                                </FieldDescription>
                            </FieldContent>
                            <Input id="name" placeholder="Evil Rabbit" required />
                        </Field>
                        <FieldSeparator />
                        <Field orientation="responsive">
                            <FieldContent>
                                <FieldLabel htmlFor="message">Message</FieldLabel>
                                <FieldDescription>
                                    You can write your message here. Keep it short, preferably
                                    under 100 characters.
                                </FieldDescription>
                            </FieldContent>
                            <Textarea
                                className="min-h-[100px] resize-none sm:min-w-[300px]"
                                id="message"
                                placeholder="Hello, world!"
                                required
                            />
                        </Field>
                        <FieldSeparator />
                        <Field orientation="responsive">
                            <Button type="submit">Submit</Button>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </Field>
                    </FieldGroup>
                </FieldSet>
            </form>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Responsive layout that stacks vertically on mobile and arranges horizontally on larger screens using orientation="responsive".'
            }
        }
    }
};

export const WithValidationError: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field data-invalid>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" aria-invalid />
                <FieldError>Enter a valid email address.</FieldError>
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Field with validation error displaying error message and visual error state.'
            }
        }
    }
};

export const VerticalOrientation: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field orientation="vertical">
                <FieldLabel htmlFor="bio">Biography</FieldLabel>
                <Textarea id="bio" placeholder="Tell us about yourself..." rows={4} />
                <FieldDescription>
                    A brief description that appears on your profile.
                </FieldDescription>
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Default vertical field orientation (label above input).'
            }
        }
    }
};

export const HorizontalOrientation: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field orientation="horizontal">
                <FieldLabel className="flex-auto" htmlFor="notifications">
                    Enable Notifications
                </FieldLabel>
                <Input id="notifications" placeholder="Your preference" type="text" />
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Horizontal field orientation where label and input are side-by-side.'
            }
        }
    }
};

export const WithFieldContent: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldTitle>Enable Touch ID</FieldTitle>
                    <FieldDescription>Unlock your device faster.</FieldDescription>
                </FieldContent>
                <Input placeholder="Setting value" type="text" />
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Using FieldContent to group FieldTitle and FieldDescription for richer field layouts.'
            }
        }
    }
};

export const SeparatorWithContent: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="email-login">Email</FieldLabel>
                    <Input id="email-login" placeholder="you@example.com" type="email" />
                </Field>
                <FieldSeparator>Or continue with</FieldSeparator>
                <Field>
                    <FieldLabel htmlFor="social-login">Social Login</FieldLabel>
                    <Input id="social-login" placeholder="Choose provider" />
                </Field>
            </FieldGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Separator with text content to divide form sections visually.'
            }
        }
    }
};

export const MultipleErrors: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <Field data-invalid>
                <FieldLabel htmlFor="username-errors">Username</FieldLabel>
                <Input id="username-errors" aria-invalid />
                <FieldError
                    errors={[
                        {message: 'Username must be at least 3 characters'},
                        {message: 'Username can only contain letters and numbers'},
                        {message: 'Username is already taken'}
                    ]}
                />
            </Field>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Field displaying multiple validation errors as a bulleted list.'
            }
        }
    }
};

export const LegendVariants: Story = {
    render: () => (
        <div className="w-full max-w-md space-y-6">
            <FieldSet>
                <FieldLegend variant="legend">Settings (Legend Style)</FieldLegend>
                <FieldDescription>
                    Legend variant uses larger text for section headings.
                </FieldDescription>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="setting1">Setting 1</FieldLabel>
                        <Input id="setting1" />
                    </Field>
                </FieldGroup>
            </FieldSet>
            <FieldSet>
                <FieldLegend variant="label">Preferences (Label Style)</FieldLegend>
                <FieldDescription>
                    Label variant uses smaller text, similar to field labels.
                </FieldDescription>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor="pref1">Preference 1</FieldLabel>
                        <Input id="pref1" />
                    </Field>
                </FieldGroup>
            </FieldSet>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Different legend variants for section headings: "legend" for larger headings, "label" for smaller ones.'
            }
        }
    }
};

export const NestedFieldGroups: Story = {
    render: () => (
        <div className="w-full max-w-md">
            <FieldGroup>
                <FieldSet>
                    <FieldLegend>Contact Information</FieldLegend>
                    <FieldDescription>
                        How can we reach you?
                    </FieldDescription>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                            <Input id="contact-email" placeholder="you@example.com" type="email" />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
                            <Input id="contact-phone" placeholder="+1 (555) 000-0000" type="tel" />
                        </Field>
                    </FieldGroup>
                </FieldSet>
                <FieldSeparator />
                <FieldSet>
                    <FieldLegend>Preferences</FieldLegend>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="language">Language</FieldLabel>
                            <Select>
                                <SelectTrigger id="language">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Spanish</SelectItem>
                                    <SelectItem value="fr">French</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                </FieldSet>
            </FieldGroup>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Multiple fieldsets organized within a field group, separated by visual dividers.'
            }
        }
    }
};
