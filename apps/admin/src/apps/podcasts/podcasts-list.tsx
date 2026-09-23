import React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { Stack, Text } from '@tryghost/shade/primitives';
import { Link, useNavigate } from '@tryghost/admin-x-framework';
import { AppsDetailShell } from '@/apps/components/apps-detail-shell';
import { ConfirmDeleteDialog } from '@/apps/components/confirm-delete-dialog';
import { LucideIcon } from '@tryghost/shade/utils';
import { PageHeader } from '@tryghost/shade/patterns';
import { toast } from 'sonner';
import { useAppActivation } from '@/apps/app-activation';
import { type Podcast, deletePodcast, useEpisodeCounts, usePodcasts } from './podcasts-store';

const PODCASTS_PATH = '/apps/podcasts';

function PodcastRow({
  podcast,
  episodeCount,
  onDelete,
}: {
  podcast: Podcast;
  episodeCount: number;
  onDelete: (podcast: Podcast) => void;
}) {
  const navigate = useNavigate();
  const detailPath = `${PODCASTS_PATH}/${podcast.id}`;

  return (
    <TableRow
      className="cursor-pointer"
      data-testid="podcast-row"
      onClick={(event) => {
        // React bubbles portal events (the row's dropdown menu) through the
        // row, so only treat clicks inside the row's own DOM as row clicks.
        if (
          event.defaultPrevented ||
          !(event.target instanceof Element) ||
          !event.currentTarget.contains(event.target) ||
          event.target.closest('a, button')
        ) {
          return;
        }
        void navigate(detailPath);
      }}
    >
      <TableCell className="px-4">
        <Stack gap="none">
          <Link className="font-semibold" to={detailPath}>
            {podcast.title}
          </Link>
          {podcast.description && (
            <Text className="line-clamp-1" size="sm" tone="secondary">
              {podcast.description}
            </Text>
          )}
        </Stack>
      </TableCell>
      <TableCell className="w-40 px-4 text-muted-foreground">{podcast.author || '—'}</TableCell>
      <TableCell className="w-32 px-4 text-muted-foreground" data-testid="podcast-episode-count">
        {episodeCount === 1 ? '1 episode' : `${episodeCount} episodes`}
      </TableCell>
      <TableCell className="w-16 px-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${podcast.title}`} size="icon" variant="ghost">
              <LucideIcon.MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`${detailPath}/manage`}>Manage</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={detailPath}>Episodes</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(podcast)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

const PodcastsList: React.FC = () => {
  const navigate = useNavigate();
  const podcasts = usePodcasts();
  const episodeCounts = useEpisodeCounts();
  const { deactivate } = useAppActivation('podcasts');
  const [pendingDelete, setPendingDelete] = React.useState<Podcast | null>(null);

  const handleDeactivate = () => {
    deactivate();
    toast.success('Podcasts deactivated');
    void navigate('/apps');
  };

  const confirmDelete = () => {
    if (pendingDelete) {
      deletePodcast(pendingDelete.id);
      toast.success(`${pendingDelete.title} was deleted`);
      setPendingDelete(null);
    }
  };

  return (
    <AppsDetailShell
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Podcasts app actions" size="icon" variant="ghost">
                <LucideIcon.MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDeactivate}
              >
                Deactivate Podcasts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {podcasts.length > 0 && (
            <PageHeader.ActionGroup.Primary>
              <Button asChild>
                <Link to={`${PODCASTS_PATH}/new`}>
                  <LucideIcon.Plus className="size-4" />
                  New podcast
                </Link>
              </Button>
            </PageHeader.ActionGroup.Primary>
          )}
        </>
      }
      breadcrumb={[
        { label: 'Apps', to: '/apps' },
        { label: 'Podcasts', testId: 'podcasts-title' },
      ]}
      testId="podcasts-list"
    >
      <Stack gap="xl">
        {podcasts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <EmptyIndicator
              actions={
                <Button asChild>
                  <Link to={`${PODCASTS_PATH}/new`}>Create your first podcast</Link>
                </Button>
              }
              description="Create a podcast, then add episodes to it."
              title="No podcasts yet"
            >
              <LucideIcon.Podcast />
            </EmptyIndicator>
          </div>
        ) : (
          <Table aria-label="Podcasts" data-testid="podcasts-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4" scope="col">
                  Podcast
                </TableHead>
                <TableHead className="w-40 px-4" scope="col">
                  Author
                </TableHead>
                <TableHead className="w-32 px-4" scope="col">
                  Episodes
                </TableHead>
                <TableHead className="w-16 px-4" scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {podcasts.map((podcast) => (
                <PodcastRow
                  key={podcast.id}
                  episodeCount={episodeCounts[podcast.id] ?? 0}
                  podcast={podcast}
                  onDelete={setPendingDelete}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      <ConfirmDeleteDialog
        confirmLabel="Delete podcast"
        description={
          pendingDelete
            ? `${pendingDelete.title} and all of its episodes will be permanently deleted.`
            : ''
        }
        open={pendingDelete !== null}
        title="Delete podcast?"
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      />
    </AppsDetailShell>
  );
};

export default PodcastsList;
