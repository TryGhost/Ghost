import React from 'react';
import {
  Badge,
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
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { Link, useNavigate, useParams } from '@tryghost/admin-x-framework';
import { AppsDetailShell } from '@/apps/components/apps-detail-shell';
import { ConfirmDeleteDialog } from '@/apps/components/confirm-delete-dialog';
import { LucideIcon } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import { PageHeader } from '@tryghost/shade/patterns';
import { getApp } from '@/apps/app-registry';
import { toast } from 'sonner';
import {
  type Episode,
  type Podcast,
  deleteEpisode,
  deletePodcast,
  useEpisodes,
  usePodcast,
} from './podcasts-store';

const PODCASTS_PATH = '/apps/podcasts';

function formatPublishedAt(value: string): string {
  if (!value) {
    return '—';
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function EpisodeRow({
  podcast,
  episode,
  onDelete,
}: {
  podcast: Podcast;
  episode: Episode;
  onDelete: (episode: Episode) => void;
}) {
  const navigate = useNavigate();
  const detailPath = `${PODCASTS_PATH}/${podcast.id}/episodes/${episode.id}`;

  return (
    <TableRow
      className="cursor-pointer"
      data-testid="episode-row"
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
            {episode.title}
          </Link>
          {episode.description && (
            <Text className="line-clamp-1" size="sm" tone="secondary">
              {episode.description}
            </Text>
          )}
        </Stack>
      </TableCell>
      <TableCell className="w-28 px-4">
        <Badge variant={episode.status === 'published' ? 'default' : 'secondary'}>
          {episode.status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </TableCell>
      <TableCell className="w-28 px-4 text-muted-foreground">{episode.duration || '—'}</TableCell>
      <TableCell className="w-36 px-4 text-muted-foreground">
        {formatPublishedAt(episode.publishedAt)}
      </TableCell>
      <TableCell className="w-16 px-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Actions for ${episode.title}`} size="icon" variant="ghost">
              <LucideIcon.MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={detailPath}>Manage</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(episode)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

/**
 * `/apps/podcasts/:podcastId`: the podcast's episodes, with the podcast's own
 * manage and delete actions in the header.
 */
const EpisodesList: React.FC = () => {
  const { podcastId } = useParams<{ podcastId: string }>();
  const navigate = useNavigate();
  const podcast = usePodcast(podcastId);
  const episodes = useEpisodes(podcastId);
  const [pendingDelete, setPendingDelete] = React.useState<Episode | null>(null);
  const [confirmPodcastDelete, setConfirmPodcastDelete] = React.useState(false);

  if (!podcast) {
    return <NotFound />;
  }

  const podcastPath = `${PODCASTS_PATH}/${podcast.id}`;
  const newEpisodePath = `${podcastPath}/episodes/new`;

  const confirmEpisodeDelete = () => {
    if (pendingDelete) {
      deleteEpisode(pendingDelete.id);
      toast.success(`${pendingDelete.title} was deleted`);
      setPendingDelete(null);
    }
  };

  const confirmDeletePodcast = () => {
    deletePodcast(podcast.id);
    toast.success(`${podcast.title} was deleted`);
    setConfirmPodcastDelete(false);
    void navigate(PODCASTS_PATH);
  };

  return (
    <AppsDetailShell
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Podcast actions" size="icon" variant="ghost">
                <LucideIcon.MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setConfirmPodcastDelete(true)}
              >
                Delete podcast
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" asChild>
            <Link data-testid="podcast-manage-link" to={`${podcastPath}/manage`}>
              Manage
            </Link>
          </Button>
          {episodes.length > 0 && (
            <PageHeader.ActionGroup.Primary>
              <Button asChild>
                <Link to={newEpisodePath}>
                  <LucideIcon.Plus className="size-4" />
                  New episode
                </Link>
              </Button>
            </PageHeader.ActionGroup.Primary>
          )}
        </>
      }
      breadcrumb={[
        { label: 'Apps', to: '/apps' },
        { label: 'Podcasts', to: PODCASTS_PATH },
        { label: podcast.title, testId: 'podcast-title' },
      ]}
      testId="episodes-list"
    >
      <Stack gap="xl">
        <Inline align="center" gap="lg">
          {podcast.artworkUrl ? (
            <img
              alt=""
              className="size-16 shrink-0 rounded-xl object-cover"
              src={podcast.artworkUrl}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: getApp('podcasts')?.color }}
            >
              <LucideIcon.Podcast className="size-8" strokeWidth={1.5} />
            </div>
          )}
          <Stack className="min-w-0" gap="xs">
            <Text as="h1" className="truncate" size="2xl" weight="semibold">
              {podcast.title}
            </Text>
            {podcast.description && (
              <Text className="line-clamp-2" size="sm" tone="secondary">
                {podcast.description}
              </Text>
            )}
            {podcast.author && (
              <Text size="sm" tone="tertiary">
                By {podcast.author}
              </Text>
            )}
          </Stack>
        </Inline>

        {episodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <EmptyIndicator
              actions={
                <Button asChild>
                  <Link to={newEpisodePath}>Add the first episode</Link>
                </Button>
              }
              description="Episodes you add here can be embedded in posts with the podcast card."
              title="No episodes yet"
            >
              <LucideIcon.Mic />
            </EmptyIndicator>
          </div>
        ) : (
          <Table aria-label="Episodes" data-testid="episodes-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4" scope="col">
                  Episode
                </TableHead>
                <TableHead className="w-28 px-4" scope="col">
                  Status
                </TableHead>
                <TableHead className="w-28 px-4" scope="col">
                  Duration
                </TableHead>
                <TableHead className="w-36 px-4" scope="col">
                  Published
                </TableHead>
                <TableHead className="w-16 px-4" scope="col">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {episodes.map((episode) => (
                <EpisodeRow
                  key={episode.id}
                  episode={episode}
                  podcast={podcast}
                  onDelete={setPendingDelete}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>

      <ConfirmDeleteDialog
        confirmLabel="Delete episode"
        description={pendingDelete ? `${pendingDelete.title} will be permanently deleted.` : ''}
        open={pendingDelete !== null}
        title="Delete episode?"
        onConfirm={confirmEpisodeDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      />
      <ConfirmDeleteDialog
        confirmLabel="Delete podcast"
        description={`${podcast.title} and all of its episodes will be permanently deleted.`}
        open={confirmPodcastDelete}
        title="Delete podcast?"
        onConfirm={confirmDeletePodcast}
        onOpenChange={setConfirmPodcastDelete}
      />
    </AppsDetailShell>
  );
};

export default EpisodesList;
