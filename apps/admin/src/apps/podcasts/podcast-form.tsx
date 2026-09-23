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
  Textarea,
} from '@tryghost/shade/components';
import { Grid, Stack } from '@tryghost/shade/primitives';
import { useNavigate, useParams } from '@tryghost/admin-x-framework';
import { AppsDetailShell } from '@/apps/components/apps-detail-shell';
import { ArtworkField } from './artwork-field';
import { ConfirmDeleteDialog } from '@/apps/components/confirm-delete-dialog';
import { DirtyConfirmDialog } from '@tryghost/shade/patterns';
import { LucideIcon } from '@tryghost/shade/utils';
import { NotFound } from '@/shared/not-found';
import { dequal } from 'dequal';
import { getSaveButtonState, type SaveStatus } from './use-save-status';
import { toast } from 'sonner';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import {
  type PodcastInput,
  createPodcast,
  deletePodcast,
  updatePodcast,
  usePodcast,
} from './podcasts-store';

const PODCASTS_PATH = '/apps/podcasts';

const EMPTY_INPUT: PodcastInput = {
  title: '',
  description: '',
  author: '',
  website: '',
  artworkUrl: '',
};

function toInput(podcast: {
  title: string;
  description: string;
  author: string;
  website: string;
  artworkUrl: string;
}): PodcastInput {
  return {
    title: podcast.title,
    description: podcast.description,
    author: podcast.author,
    website: podcast.website,
    artworkUrl: podcast.artworkUrl,
  };
}

/**
 * Create (`/apps/podcasts/new`) and manage (`/apps/podcasts/:podcastId/manage`)
 * a podcast's metadata, in the same shape as the tag detail screen: a form
 * card with a header Save button that reports Saved, an actions menu holding
 * delete, and a discard prompt on leaving with unsaved changes. Stub: saves to
 * the local podcasts store.
 */
const PodcastForm: React.FC = () => {
  const { podcastId } = useParams<{ podcastId: string }>();
  const navigate = useNavigate();
  const isCreating = podcastId === undefined;
  const podcast = usePodcast(podcastId);
  const [draft, setDraft] = React.useState<PodcastInput>(() =>
    podcast ? toInput(podcast) : EMPTY_INPUT,
  );
  const [saved, setSaved] = React.useState<PodcastInput>(draft);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [uploadPending, setUploadPending] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  const hasUnsavedChanges = !dequal(draft, saved);
  const { dialogProps, bypassNextNavigation } = useUnsavedChangesGuard({
    when: hasUnsavedChanges || uploadPending,
  });

  if (!isCreating && !podcast) {
    return <NotFound />;
  }

  const update = (patch: Partial<PodcastInput>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaveStatus('idle');
  };

  const validate = () => {
    const error = draft.title.trim() ? null : 'A podcast needs a title.';
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
      const created = createPodcast(input);
      setSaved(input);
      bypassNextNavigation();
      void navigate(`${PODCASTS_PATH}/${created.id}`, { replace: true });
      return;
    }
    if (podcast) {
      updatePodcast(podcast.id, input);
      setDraft(input);
      setSaved(input);
      setSaveStatus('success');
    }
  };

  const onDelete = () => {
    if (!podcast) {
      return;
    }
    deletePodcast(podcast.id);
    setShowDelete(false);
    toast.success(`${podcast.title} was deleted`);
    bypassNextNavigation();
    void navigate(PODCASTS_PATH);
  };

  const { label: saveLabel, variant: saveVariant } = getSaveButtonState(
    saveStatus,
    hasUnsavedChanges,
  );

  const breadcrumb = [
    { label: 'Apps', to: '/apps' },
    { label: 'Podcasts', to: PODCASTS_PATH },
    ...(podcast ? [{ label: podcast.title, to: `${PODCASTS_PATH}/${podcast.id}` }] : []),
    { label: isCreating ? 'New podcast' : 'Manage', testId: 'podcast-form-title' },
  ];

  return (
    <AppsDetailShell
      actions={
        <>
          {podcast && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Podcast actions"
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
                  Delete podcast
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            className="min-w-16"
            data-testid="podcast-form-save"
            disabled={uploadPending}
            variant={saveVariant}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </>
      }
      breadcrumb={breadcrumb}
      testId="podcast-form"
    >
      <Grid
        align="start"
        className="lg:grid-cols-2 sidebarlg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
        gap="2xl"
      >
        <Card data-testid="podcast-details-card">
          <CardContent className="p-6">
            <Stack gap="lg">
              <Stack gap="sm">
                <Label htmlFor="podcast-title">Title</Label>
                <Input
                  aria-describedby={titleError ? 'podcast-title-error' : undefined}
                  aria-invalid={!!titleError}
                  id="podcast-title"
                  value={draft.title}
                  onBlur={validate}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <FieldError className="text-sm" id="podcast-title-error">
                  {titleError}
                </FieldError>
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="podcast-description">Description</Label>
                <Textarea
                  className="min-h-24"
                  id="podcast-description"
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="podcast-author">Author</Label>
                <Input
                  id="podcast-author"
                  value={draft.author}
                  onChange={(e) => update({ author: e.target.value })}
                />
              </Stack>

              <Stack gap="sm">
                <Label htmlFor="podcast-website">Website</Label>
                <Input
                  id="podcast-website"
                  placeholder="https://"
                  type="url"
                  value={draft.website}
                  onChange={(e) => update({ website: e.target.value })}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card data-testid="podcast-artwork-card">
          <CardContent className="p-6">
            <ArtworkField
              id="podcast-artwork"
              label="Artwork"
              value={draft.artworkUrl}
              onChange={(artworkUrl) => update({ artworkUrl })}
              onUploadPendingChange={setUploadPending}
            />
          </CardContent>
        </Card>
      </Grid>

      <DirtyConfirmDialog {...dialogProps} />
      {podcast && (
        <ConfirmDeleteDialog
          confirmLabel="Delete"
          description={
            <>
              You’re about to delete the podcast &quot;<strong>{podcast.title}</strong>&quot; and
              all of its episodes. This is permanent.
            </>
          }
          open={showDelete}
          title="Are you sure you want to delete this podcast?"
          onConfirm={onDelete}
          onOpenChange={setShowDelete}
        />
      )}
    </AppsDetailShell>
  );
};

export default PodcastForm;
