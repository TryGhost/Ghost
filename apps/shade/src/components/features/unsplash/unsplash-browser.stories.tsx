import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {UnsplashBrowser} from './unsplash-browser';

const meta = {
    title: 'Features / Unsplash Browser',
    component: UnsplashBrowser,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'A full-screen modal for browsing and selecting photos from Unsplash. Features search, infinite scroll, photo zoom, and responsive grid layout.'
            }
        }
    },
    tags: ['autodocs'],
    argTypes: {
        isOpen: {
            control: 'boolean',
            description: 'Whether the browser modal is open'
        },
        onClose: {
            action: 'closed',
            description: 'Callback when the browser is closed'
        },
        onSelect: {
            action: 'photo selected',
            description: 'Callback when a photo is selected'
        }
    }
} satisfies Meta<typeof UnsplashBrowser>;

export default meta;
type Story = StoryObj<typeof meta>;

// Create a QueryClient for Storybook
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            staleTime: 5 * 60 * 1000 // 5 minutes
        }
    }
});

// Demo component that manages the modal state
const UnsplashBrowserDemo = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (photoData: {
        src: string;
        width: number;
        height: number;
        alt: string;
        caption: string;
    }) => {
        // eslint-disable-next-line no-console
        console.log('Selected photo:', photoData);
        setIsOpen(false);
    };

    return (
        <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="mx-auto max-w-md space-y-4">
                    <Button className="w-full" onClick={() => setIsOpen(true)}>
                        Open Unsplash Browser (Controlled)
                    </Button>
                    <UnsplashBrowser
                        showTrigger={true}
                        onSelect={handleSelect}
                    />
                </div>
                <UnsplashBrowser
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onSelect={handleSelect}
                />
            </div>
        </QueryClientProvider>
    );
};

export const Default: Story = {
    args: {
        isOpen: false,
        onClose: () => {},
        onSelect: () => {}
    },
    render: () => <UnsplashBrowserDemo />
};

export const WithTrigger: Story = {
    args: {
        showTrigger: true,
        onSelect: () => {}
    },
    decorators: [
        StoryComponent => (
            <QueryClientProvider client={queryClient}>
                <div className="p-8">
                    <StoryComponent />
                </div>
            </QueryClientProvider>
        )
    ]
};