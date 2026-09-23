import React from 'react';
import { Avatar, AvatarFallback, Button } from '@tryghost/shade/components';
import { Box, Container, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { ListPage } from '@tryghost/shade/page-templates';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import { BOARD_COLUMNS, BOARD_ITEMS, type BoardItem } from './board-data';

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function Thumbnail({ hasImage }: { hasImage: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-sm',
        hasImage ? 'bg-muted-foreground/30' : 'border border-dashed border-border bg-muted/40',
      )}
    >
      {hasImage ? (
        <LucideIcon.Image className="size-4 text-background" strokeWidth={1.5} />
      ) : (
        <LucideIcon.Lightbulb className="size-4 text-muted-foreground" strokeWidth={1.5} />
      )}
    </span>
  );
}

function Assignee({ name }: { name: string | null }) {
  if (!name) {
    return (
      <Text size="xs" tone="tertiary">
        Unassigned
      </Text>
    );
  }
  return (
    <Inline align="center" gap="xs">
      <Avatar className="size-4">
        <AvatarFallback className="text-[9px]">{name[0]}</AvatarFallback>
      </Avatar>
      <Text size="xs" tone="secondary">
        {name}
      </Text>
    </Inline>
  );
}

function BoardCard({ item }: { item: BoardItem }) {
  return (
    <button
      className="w-full rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-shadow hover:shadow-sm"
      data-testid="editorial-board-card"
      type="button"
    >
      <Stack gap="sm">
        <Inline align="start" gap="sm">
          <Thumbnail hasImage={item.hasImage} />
          <Text className="line-clamp-2" size="sm" weight="medium">
            {item.title}
          </Text>
        </Inline>
        <Inline align="center" justify="between">
          <Assignee name={item.assignee} />
          <Text size="xs" tone="tertiary">
            {formatDate(item.date)}
          </Text>
        </Inline>
      </Stack>
    </button>
  );
}

/**
 * The Editorial board: a mocked Kanban of the publication's schedule. Each
 * stage is a column in its own colour. Nothing here is persisted.
 */
const EditorialBoard: React.FC = () => {
  return (
    <Box className="size-full">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage data-testid="editorial-board-page">
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Editorial board</PageHeader.Title>
              </PageHeader.Left>
              <PageHeader.Actions>
                <PageHeader.ActionGroup>
                  <PageHeader.ActionGroup.Primary>
                    <Button>
                      <LucideIcon.Plus className="size-4" />
                      New idea
                    </Button>
                  </PageHeader.ActionGroup.Primary>
                </PageHeader.ActionGroup>
              </PageHeader.Actions>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body className="min-h-0">
            <div
              className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2"
              data-testid="editorial-board-columns"
            >
              {BOARD_COLUMNS.map((column) => {
                const items = BOARD_ITEMS.filter((item) => item.stage === column.id);
                return (
                  <section
                    key={column.id}
                    aria-label={column.label}
                    className="flex w-64 shrink-0 flex-col rounded-xl"
                    data-testid="editorial-board-column"
                    style={{ backgroundColor: `${column.color}14` }}
                  >
                    <Inline align="center" className="px-3 pt-3 pb-2" gap="sm">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <Text
                        className="tracking-wide uppercase"
                        size="xs"
                        style={{ color: column.color }}
                        weight="semibold"
                      >
                        {column.label}
                      </Text>
                      {/* Softer than the tertiary grey so it sits inside the column's tint. */}
                      <Text className="text-foreground/45" size="xs" weight="medium">
                        {items.length}
                      </Text>
                      <span className="grow" />
                      <Button
                        aria-label={`Add to ${column.label}`}
                        className="size-6"
                        size="icon"
                        variant="ghost"
                      >
                        <LucideIcon.Plus className="size-3.5" />
                      </Button>
                    </Inline>
                    <Stack className="min-h-0 overflow-y-auto px-2 pb-2" gap="sm">
                      {items.map((item) => (
                        <BoardCard key={item.id} item={item} />
                      ))}
                    </Stack>
                  </section>
                );
              })}
            </div>
          </ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
};

export default EditorialBoard;
