import type { Meta, StoryObj } from '@storybook/react-vite';
import { Pencil, Trash2, Upload } from 'lucide-react';

import ghostLogo from '@/assets/images/ghost-logo.svg';
import { Stack } from '@/components/primitives';
import {
  ImageUpload,
  ImageUploadAction,
  ImageUploadActions,
  ImageUploadDropzone,
  ImageUploadImage,
  ImageUploadPreview,
} from '@/components/patterns/image-upload';

const meta = {
  title: 'Patterns / Image Upload',
  component: ImageUpload,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Composable image upload with a Dropzone empty state and preview actions.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-40 w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ImageUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => (
    <ImageUpload className="size-full">
      <ImageUploadDropzone>
        <Upload className="mb-2 size-5" />
        <span className="text-control font-medium">Upload image</span>
      </ImageUploadDropzone>
    </ImageUpload>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use the empty state when an image has not been selected.',
      },
    },
  },
};

export const Dashed: Story = {
  render: () => (
    <ImageUpload className="size-full">
      <ImageUploadDropzone variant="default">
        <Stack align="center" gap="sm">
          <Upload className="size-6" />
          <span className="text-sm">Upload image</span>
        </Stack>
      </ImageUploadDropzone>
    </ImageUpload>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'With admin7Design on, the default Dropzone variant has a one-pixel dashed border, matching muted icon and text, and an unclipped focus ring. With the flag off, the previous clipping, border, and prompt styling remain.',
      },
    },
  },
};

export const Preview: Story = {
  render: () => (
    <ImageUpload className="size-full">
      <ImageUploadPreview>
        <ImageUploadImage className="object-contain p-8" src={ghostLogo} />
        <ImageUploadActions>
          <ImageUploadAction aria-label="Edit image">
            <Pencil />
          </ImageUploadAction>
          <ImageUploadAction aria-label="Remove image">
            <Trash2 />
          </ImageUploadAction>
        </ImageUploadActions>
      </ImageUploadPreview>
    </ImageUpload>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Use the preview state after upload, with relevant actions layered over the image.',
      },
    },
  },
};

export const FocusVisible: Story = {
  render: () => (
    <ImageUpload className="size-full">
      <ImageUploadDropzone autoFocus>
        <Upload className="mb-2 size-5" />
        <span className="text-control font-medium">Focused upload</span>
      </ImageUploadDropzone>
    </ImageUpload>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Keyboard focus uses the shared form-control focus treatment.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <ImageUpload className="size-full">
      <ImageUploadDropzone disabled>
        <Upload className="mb-2 size-5" />
        <span className="text-control font-medium">Upload unavailable</span>
      </ImageUploadDropzone>
    </ImageUpload>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disable the dropzone while upload is unavailable or already in progress.',
      },
    },
  },
};
