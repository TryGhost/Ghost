import type {Meta, StoryObj} from '@storybook/react-vite';
import * as React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage} from './form';
import {Input} from './input';
import {Textarea} from './textarea';
import {Button} from './button';

const meta = {
    title: 'Components / Form',
    component: Form,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component: 'Form components built on react-hook-form and Radix UI. Provides accessible form structure with validation support using Zod schemas.'
            }
        }
    }
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof Form>;

const formSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters')
});

type FormData = z.infer<typeof formSchema>;

const DefaultFormComponent = () => {
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            name: '',
            message: ''
        }
    });

    const onSubmit = (data: FormData) => {
        alert(`Form submitted with: ${JSON.stringify(data, null, 2)}`);
    };

    return (
        <div style={{padding: '24px', maxWidth: '400px'}}>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormDescription>
                                    This is your display name.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your email" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="message"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Enter your message" {...field} />
                                </FormControl>
                                <FormDescription>
                                    Tell us what you&apos;d like to discuss.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </div>
    );
};

export const Default: Story = {
    render: () => <DefaultFormComponent />,
    parameters: {
        docs: {
            description: {
                story: 'Complete form example with validation, descriptions, and error messages.'
            }
        }
    }
};

const WithErrorsFormComponent = () => {
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: 'invalid-email',
            name: 'A',
            message: 'Too short'
        }
    });

    const onSubmit = (data: FormData) => {
        alert(`Form submitted with: ${JSON.stringify(data, null, 2)}`);
    };

    // Trigger validation on mount
    React.useEffect(() => {
        form.trigger();
    }, [form]);

    return (
        <div style={{padding: '24px', maxWidth: '400px'}}>
            <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your email" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="message"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Enter your message" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit">Submit</Button>
                </form>
            </Form>
        </div>
    );
};

export const WithErrors: Story = {
    render: () => <WithErrorsFormComponent />,
    parameters: {
        docs: {
            description: {
                story: 'Form with validation errors displayed for invalid inputs.'
            }
        }
    }
};
