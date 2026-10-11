import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Home, Settings, Tag } from 'lucide-react';

import { FloatingSidebar } from './floating-sidebar';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './sidebar';

const meta = {
  title: 'Components / Floating sidebar',
  component: FloatingSidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A glass capsule that morphs between a circle around an icon (closed), a full-height panel floating over the content (open: hover the circle or the left screen edge, focus or click it) and the same panel docked (pinned). Use inside a SidebarProvider on desktop, with the sidebar menu primitives in its body. Pinned, its gap offsets the content at once; content that should glide in step, or keep clear of the closed circle, uses the exported metrics and `getFloatingSidebarTiming`.',
      },
    },
  },
} satisfies Meta<typeof FloatingSidebar>;

export default meta;
type Story = StoryObj<typeof FloatingSidebar>;

const items = [
  { icon: Home, label: 'Dashboard' },
  { icon: FileText, label: 'Posts' },
  { icon: Tag, label: 'Tags' },
  { icon: Settings, label: 'Settings' },
];

function Example({ defaultPinned }: { defaultPinned: boolean }) {
  const [pinned, setPinned] = useState(defaultPinned);

  return (
    <SidebarProvider className="min-h-[600px]">
      {/* Pinned, its gap pushes the content aside */}
      <FloatingSidebar
        header={<span className="truncate text-lg font-medium">My site</span>}
        icon={<span className="block bg-foreground" />}
        label="My site"
        pinned={pinned}
        onPinnedChange={setPinned}
      >
        <SidebarGroup className="px-0">
          <SidebarMenu>
            {items.map(({ icon: Icon, label }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </FloatingSidebar>
      <main className="flex-1 p-10 pt-24 text-muted-foreground">Page content</main>
    </SidebarProvider>
  );
}

export const Unpinned: Story = {
  render: () => <Example defaultPinned={false} />,
  parameters: {
    docs: {
      description: {
        story:
          'The closed circle over the content. Hover it or the left edge, focus or click it to open the panel; its pin button docks it.',
      },
    },
  },
};

export const Pinned: Story = {
  render: () => <Example defaultPinned />,
  parameters: {
    docs: {
      description: {
        story:
          'Docked beside the content, which it offsets. Hover it for the button that unpins it.',
      },
    },
  },
};
