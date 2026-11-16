import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileText, Home, Settings, Tag } from 'lucide-react';
import { Banner } from './banner';
import { Stack } from '@/components/primitives/stack';
import { Text } from '@/components/primitives/text';

import { FloatingSidebar } from './floating-sidebar';
import {
  SidebarGroup,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './sidebar';

const meta = {
  title: 'Components / Floating sidebar',
  component: FloatingSidebar,
  tags: ['autodocs'],
  argTypes: {
    overflow: { control: { type: 'select' }, options: ['clip', 'visible'] },
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A glass capsule that morphs between a circle around an icon (closed), a full-height panel floating over the content (open: hover the circle or the left screen edge, focus or click it) and the same panel docked (pinned). Use inside a SidebarProvider on desktop, with the sidebar menu primitives in its body. Pinned, its gap offsets the content at once; content that should glide in step, or keep clear of the closed circle, uses the exported metrics and `getFloatingSidebarTiming`. The capsule exposes `data-controls-visible="true"` when secondary actions should show, sharing the pin’s hover intent and keyboard focus state. Descendant actions can follow that attribute with the same 200ms opacity transition and 75ms reveal delay; mouse-click focus alone does not keep them visible.',
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

function Example({
  defaultPinned,
  headerHidden,
  longMenu = false,
}: {
  defaultPinned: boolean;
  headerHidden?: boolean;
  longMenu?: boolean;
}) {
  const [pinned, setPinned] = useState(defaultPinned);

  return (
    <SidebarProvider className="min-h-[600px]">
      {/* Pinned, its gap pushes the content aside */}
      <FloatingSidebar
        header={<span className="truncate text-lg font-medium">My site</span>}
        headerHidden={headerHidden}
        icon={<span className="block bg-foreground" />}
        label="My site"
        pinLocked={headerHidden}
        pinned={pinned}
        onPinnedChange={setPinned}
      >
        <SidebarGroup className="px-0">
          <SidebarMenu>
            {[
              ...items,
              ...(longMenu
                ? Array.from({ length: 20 }, (_, index) => ({
                    icon: FileText,
                    label: `More navigation ${String.fromCharCode(65 + index)}`,
                  }))
                : []),
            ].map(({ icon: Icon, label }) => (
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
          'The closed circle over the content. Hover it or the strip beneath it, focus or click it to open the panel; its pin button docks it.',
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
          'Docked beside the content, which it offsets. Hover it for the button that unpins it. With admin7Design on, the header icon stays 32px across desktop widths; with it off, the existing responsive sizing is preserved.',
      },
    },
  },
};

export const HeaderHidden: Story = {
  render: () => <Example defaultPinned headerHidden />,
  parameters: {
    docs: {
      description: {
        story: 'Without the header row, for a screen whose navigation has its own top row.',
      },
    },
  },
};

export const LongMenu: Story = {
  render: () => <Example defaultPinned={false} longMenu />,
  parameters: {
    docs: {
      description: {
        story:
          'The default clipping mode scrolls ordinary long children when the open panel reaches the viewport height.',
      },
    },
  },
};

function OverflowVisibleExample() {
  const [pinned, setPinned] = useState(true);
  return (
    <SidebarProvider className="min-h-[600px]">
      <FloatingSidebar
        header={<span>My site</span>}
        icon={<span className="block bg-foreground" />}
        label="My site"
        overflow="visible"
        pinned={pinned}
        onPinnedChange={setPinned}
      >
        <SidebarContent>
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
        </SidebarContent>
        <Banner className="mx-2 shrink" variant="gradient" scroll>
          <Stack gap="sm">
            <Text weight="semibold">An announcement</Text>
            <Text size="sm">
              The caller owns scrolling while the card&apos;s glow can paint beyond the open panel.
            </Text>
          </Stack>
        </Banner>
      </FloatingSidebar>
      <main className="flex-1 p-10 pt-24 text-muted-foreground">Page content</main>
    </SidebarProvider>
  );
}

export const VisibleOverflow: Story = {
  render: () => <OverflowVisibleExample />,
  parameters: {
    docs: {
      description: {
        story:
          'Opt in to visible paint overflow for a glowing banner; bound navigation and card content with their own scroll areas. The closed panel still clips its animation.',
      },
    },
  },
};
