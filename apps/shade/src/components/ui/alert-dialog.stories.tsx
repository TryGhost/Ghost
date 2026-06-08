import type {Meta, StoryObj} from '@storybook/react-vite';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction
} from './alert-dialog';
import {Button} from './button';

const meta = {
    title: 'Components / Alert Dialog',
    component: AlertDialog,
    tags: ['autodocs'],
    parameters: {
        docs: {
            description: {
                component:
                    'Destructive action confirmation modal. Use for critical, irreversible operations where an explicit confirm/cancel choice is required.'
            }
        }
    },
    argTypes: {
        children: {
            table: {
                disable: true
            }
        }
    }
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof AlertDialog>;

export const Default: Story = {
    parameters: {
        docs: {
            description: {
                story:
                    'Use for confirming destructive actions (e.g., delete). Primary action should be explicit; provide a safe Cancel.'
            }
        }
    },
    args: {
        children: (
            <>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete item</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the item and remove its data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button variant="outline">Cancel</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button variant="destructive">Confirm delete</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </>
        )
    }
};

