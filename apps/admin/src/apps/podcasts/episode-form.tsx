import React from 'react';
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@tryghost/shade/components';
import { Grid, Stack } from '@tryghost/shade/primitives';
import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { AppsDetailShell } from '@/apps/components/apps-detail-shell';
import { ArtworkField } from './artwork-field';
import { ConfirmDeleteDialog } from '@/apps/components/confirm-delete-dialog';
import { CreatePostDialog } from './create-post-dialog';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { LucideIcon } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import { dequal } from 'dequal';
import { getSaveButtonState, type SaveStatus } from './use-save-status';
import { toast } from 'sonner';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  type Episode,
  type EpisodeInput,
  type EpisodeStatus,
  createEpisode,
  deleteEpisode,
  updateEpisode,
  useEpisode,
  usePodcast,
} from './podcasts-store';

const PODCASTS_PATH = '/apps/podcasts';

type EpisodeDraft = Required<EpisodeInput>;

const EMPTY_INPUT: EpisodeDraft = {
  title: '',
  description: '',
  audioUrl: '',
  duration: '',
  status: 'draft',
  publishedAt: '',
  artworkUrl: '',
};

function toDraft(episode: Episode): EpisodeDraft {
  return {
    title: episode.title,
    description: episode.description,
    audioUrl: episode.audioUrl,
    duration: episode.duration,
    status: episode.status,
    publishedAt: episode.publishedAt,
    artworkUrl: episode.artworkUrl,
  };
}

/**
 * Create (`/apps/podcasts/:podcastId/episodes/new`) and manage
 * (`/apps/podcasts/:podcastId/episodes/:episodeId`) an episode's metadata, in
 * the same shape as the tag detail screen. Stub: saves to the local podcasts
 * store.
 */
const EpisodeForm: React.FC = () => {
  const { podcastId, episodeId } = useParams<{ podcastId: string; episodeId: string }>();
  const navigate = useNavigate();
  const podcast = usePodcast(podcastId);
  const isCreating = episodeId === undefined;
  const episode = useEpisode(episodeId);
  const [draft, setDraft] = React.useState<EpisodeDraft>(() =>
    episode ? toDraft(episode) : EMPTY_INPUT,
  );
  const [saved, setSaved] = React.useState<EpisodeDraft>(draft);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [uploadPending, setUploadPending] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  // Set once a new episode is saved; offers to start a post about it.
  const [createdEpisode, setCreatedEpisode] = React.useState<Episode | null>(null);

  const hasUnsavedChanges = !dequal(draft, saved);
  const { dialogProps, bypassNextNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges || uploadPending,
  });

  if (!podcast || (!isCreating && (!episode || episode.podcastId !== podcast.id))) {
    return <NotFound />;
  }

  const podcastPath = `${PODCASTS_PATH}/${podcast.id}`;

  const update = (patch: Partial<EpisodeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveStatus('idle');
  };

  const validate = () => {
    const error = draft.title.trim() ? null : 'An episode needs a title.';
    setTitleError(error);
    return error === null;
  };

  const onSave = () => {
    if (!validate()) {
      setSaveStatus('error');
      return;
    }
    const input = { ...draft, title: draft.title.trim() };
    if (isCreating) {
      const created = createEpisode(podcast.id, input);
      setSaved(input);
      setSaveStatus('success');
      setCreatedEpisode(created);
      return;
    }
    if (episode) {
      updateEpisode(episode.id, input);
      setDraft(input);
      setSaved(input);
      setSaveStatus('success');
    }
  };

  const onDelete = () => {
    if (!episode) {
      return;
    }
    deleteEpisode(episode.id);
    setShowDelete(false);
    toast.success(`${episode.title} was deleted`);
    bypassNextNavigation();
    void navigate(podcastPath);
  };

  const { label: saveLabel, variant: saveVariant } = getSaveButtonState(
    saveStatus,
    hasUnsavedChanges,
  );

  return (
    <AppsDetailShell
      actions={
        <>
          {episode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Episode actions"
                  className="size-(--control-height)"
                  size="icon"
                  variant="subtle"
                >
                  <LucideIcon.Ellipsis size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setShowDelete(true)}
                >
                  <LucideIcon.Trash />
                  Delete episode
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            className="min-w-16"
            data-testid="episode-form-save"
            disabled={uploadPending}
            variant={saveVariant}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </>
      }
      breadcrumb={[
        { label: 'Apps', to: '/apps' },
        { label: 'Podcasts', to: PODCASTS_PATH },
        { label: podcast.title, to: podcastPath },
        {
          label: isCreating ? 'New episode' : (episode?.title ?? ''),
          testId: 'episode-form-title',
        },
      ]}
      testId="episode-form"
    >
      <Grid
        align="start"
        className="lg:grid-cols-2 sidebarlg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
        gap="2xl"
      >
        <Card data-testid="episode-details-card">
          <CardContent className="p-6">
            <Stack gap="lg">
              <Stack gap="sm">
                <Label htmlFor="episode-title">Title</Label>
                <Input
                  aria-describedby={titleError ? 'episode-title-error' : undefined}
                  aria-invalid={!!titleError}
                  id="episode-title"
                  value={draft.title}
                  onBlur={validate}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <FieldError className="text-sm" id="episode-title-error">
                  {titleError}
                </FieldError>
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="episode-description">Description</Label>
                <Textarea
                  className="min-h-24"
                  id="episode-description"
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="episode-audio">Audio URL</Label>
                <Input
                  id="episode-audio"
                  placeholder="https://example.com/episode.mp3"
                  type="url"
                  value={draft.audioUrl}
                  onChange={(e) => update({ audioUrl: e.target.value })}
                />
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="episode-duration">Duration</Label>
                <Input
                  id="episode-duration"
                  placeholder="42:10"
                  value={draft.duration}
                  onChange={(e) => update({ duration: e.target.value })}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card data-testid="episode-publishing-card">
          <CardContent className="p-6">
            <Stack gap="lg">
              <Stack gap="sm">
                <Label htmlFor="episode-status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(value) => update({ status: value as EpisodeStatus })}
                >
                  <SelectTrigger id="episode-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="episode-published">Publish date</Label>
                <Input
                  id="episode-published"
                  type="date"
                  value={draft.publishedAt}
                  onChange={(e) => update({ publishedAt: e.target.value })}
                />
              </Stack>

              <ArtworkField
                id="episode-artwork"
                label="Episode artwork"
                value={draft.artworkUrl}
                onChange={(artworkUrl) => update({ artworkUrl })}
                onUploadPendingChange={setUploadPending}
              />
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <DirtyConfirmDialog {...dialogProps} />
      {createdEpisode && (
        <CreatePostDialog
          episode={createdEpisode}
          open={true}
          podcast={podcast}
          onDismiss={() => {
            setCreatedEpisode(null);
            bypassNextNavigation();
            void navigate(podcastPath, { replace: true });
          }}
        />
      )}
      {episode && (
        <ConfirmDeleteDialog
          confirmLabel="Delete"
          description={
            <>
              You’re about to delete the episode &quot;<strong>{episode.title}</strong>&quot;. This
              is permanent.
            </>
          }
          open={showDelete}
          title="Are you sure you want to delete this episode?"
          onConfirm={onDelete}
          onOpenChange={setShowDelete}
        />
      )}
    </AppsDetailShell>
  );
};

export default EpisodeForm;
