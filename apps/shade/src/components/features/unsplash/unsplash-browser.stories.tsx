import type {Meta, StoryObj} from '@storybook/react';
import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Dialog, DialogTrigger} from '@/components/ui/dialog';
import {
    UnsplashImagePicker,
    UnsplashDialogContent,
    PhotoData
} from './unsplash-browser';
import {Button} from '@/components/ui/button';

const meta = {
    title: 'Features / Unsplash Image Picker',
    component: UnsplashImagePicker,
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'A composable Unsplash image picker with separate trigger and dialog content components. Features search, infinite scroll, photo zoom, and responsive grid layout.'
            }
        }
    },
    tags: ['autodocs'],
    argTypes: {
        onSelect: {
            action: 'photo selected',
            description: 'Callback when a photo is selected'
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes for the trigger button'
        }
    }
} satisfies Meta<typeof UnsplashImagePicker>;

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

// Demo component showing different usage patterns
const UnsplashDemo = () => {
    const [photoData, setPhotoData] = useState<PhotoData | null>(null);
    const handleSelect = (photo: PhotoData) => {
        setPhotoData(photo);
    };

    return (
        <QueryClientProvider client={queryClient}>
            <div className="flex flex-col items-center gap-4 p-8">
                {photoData && (
                    <img
                        alt={photoData.alt}
                        className="w-32 "
                        src={photoData.src}
                    />
                )}
                <UnsplashImagePicker onSelect={handleSelect} />
            </div>
        </QueryClientProvider>
    );
};

export const Default: Story = {
    args: {
        onSelect: () => {}
    },
    render: () => <UnsplashDemo />
};

function ComposableDemo() {
    const [photoData, setPhotoData] = useState<PhotoData | null>(null);
    const handleSelect = (photo: PhotoData) => {
        setPhotoData(photo);
    };
    return (
        <QueryClientProvider client={queryClient}>
            <div className="flex flex-col items-center gap-4 p-8">
                {photoData && (
                    <img
                        alt={photoData.alt}
                        className="w-32 "
                        src={photoData.src}
                    />
                )}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Open Unsplash Image Picker</Button>
                    </DialogTrigger>
                    <UnsplashDialogContent onSelect={handleSelect} />
                </Dialog>
            </div>
        </QueryClientProvider>
    );
}

export const Composable: Story = {
    args: {
        onSelect: () => {}
    },
    render: () => <ComposableDemo />
};
