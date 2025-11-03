import type {Meta, StoryObj} from '@storybook/react-vite';
import * as React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Switch} from './switch';
import {Label} from './label';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel} from './form';
import {Button} from './button';

const meta = {
    title: 'Components / Switch',
    component: Switch,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'A control that allows users to toggle between checked and unchecked states. Built on Radix UI Switch primitive.'
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
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
    args: {},
    parameters: {
        docs: {
            description: {
                story: 'Basic switch component without a label in default size.'
            }
        }
    }
};

export const Small: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="small-switch" size="sm" />
            <Label htmlFor="small-switch">Small Switch</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Smaller variant of the switch component (h-4 w-7 with h-3 w-3 thumb).'
            }
        }
    }
};

export const WithLabel: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Switch with an associated label for better accessibility and UX.'
            }
        }
    }
};

export const Checked: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="notifications" defaultChecked />
            <Label htmlFor="notifications">Enable Notifications</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Switch in the checked/on state by default.'
            }
        }
    }
};

export const Disabled: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="disabled-switch" disabled />
            <Label htmlFor="disabled-switch">Disabled Switch</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled switch that cannot be interacted with.'
            }
        }
    }
};

export const DisabledChecked: Story = {
    render: () => (
        <div className="flex items-center space-x-2">
            <Switch id="disabled-checked" defaultChecked disabled />
            <Label htmlFor="disabled-checked">Disabled (Checked)</Label>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Disabled switch in the checked state.'
            }
        }
    }
};

export const Controlled: Story = {
    render: () => {
        const [checked, setChecked] = React.useState(false);

        return (
            <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={checked}
                        id="controlled-switch"
                        onCheckedChange={setChecked}
                    />
                    <Label htmlFor="controlled-switch">
                        {checked ? 'Enabled' : 'Disabled'}
                    </Label>
                </div>
                <div className="text-sm text-muted-foreground">
                    Current state: {checked ? 'On' : 'Off'}
                </div>
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: 'Controlled switch with state managed in React. The label text updates based on the switch state.'
            }
        }
    }
};

const formSchema = z.object({
    marketingEmails: z.boolean(),
    securityEmails: z.boolean(),
    productUpdates: z.boolean()
});

type FormData = z.infer<typeof formSchema>;

const FormExample = () => {
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            marketingEmails: false,
            securityEmails: true,
            productUpdates: true
        }
    });

    const onSubmit = (data: FormData) => {
        alert(`Form submitted:\n${JSON.stringify(data, null, 2)}`);
    };

    return (
        <div style={{maxWidth: '400px'}}>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <div>
                        <h3 className="mb-4 text-lg font-medium">Email Notifications</h3>
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="marketingEmails"
                                render={({field}) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Marketing emails</FormLabel>
                                            <FormDescription>
                                                Receive emails about new products, features, and more.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="securityEmails"
                                render={({field}) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Security emails</FormLabel>
                                            <FormDescription>
                                                Receive emails about your account security.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="productUpdates"
                                render={({field}) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <FormLabel>Product updates</FormLabel>
                                            <FormDescription>
                                                Receive emails about product updates and improvements.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                    <Button type="submit">Save preferences</Button>
                </form>
            </Form>
        </div>
    );
};

export const FormIntegration: Story = {
    render: () => <FormExample />,
    parameters: {
        docs: {
            description: {
                story: 'Switch components integrated with react-hook-form for managing notification preferences. This example demonstrates a common use case for switches in settings forms.'
            }
        }
    }
};

export const MultipleSettings: Story = {
    render: () => (
        <div className="space-y-4" style={{maxWidth: '400px'}}>
            <div className="flex items-center justify-between">
                <Label htmlFor="wifi">Wi-Fi</Label>
                <Switch id="wifi" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="bluetooth">Bluetooth</Label>
                <Switch id="bluetooth" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="airplane">Airplane Mode</Label>
                <Switch id="airplane" />
            </div>
            <div className="flex items-center justify-between">
                <Label htmlFor="location">Location Services</Label>
                <Switch id="location" defaultChecked />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Multiple switches arranged in a settings list layout with labels aligned to the left and switches to the right.'
            }
        }
    }
};

export const SizeComparison: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch id="size-default" />
                <Label htmlFor="size-default">Default size</Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch id="size-small" size="sm" />
                <Label htmlFor="size-small">Small size</Label>
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: 'Comparison of available switch sizes: default (h-5 w-9) and small (h-4 w-7).'
            }
        }
    }
};
