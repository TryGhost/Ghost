import moment from 'moment-timezone';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useAddPage } from '@tryghost/admin-x-framework/api/pages';
import { useAddPost } from '@tryghost/admin-x-framework/api/posts';
import { isAuthorOrContributor } from '@tryghost/admin-x-framework/api/users';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import {
  Button,
  EmptyIndicator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tryghost/shade/components';
import { ListPage } from '@tryghost/shade/page-templates';
import { PageHeader } from '@tryghost/shade/patterns';
import { Box, Container, Text } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { readLocalRevisions, type StoredLocalRevision } from '@/editor/local-revisions';
import { restoredPost, type RestoredPost } from '@/editor/restore/restored-post';
import { lexicalToText } from '@/editor/session/content-text';
import { AdminLink } from '@/shared/admin-link';

const PREVIEW_LENGTH = 100;

interface Restored {
  id: string;
  type: RestoredPost['type'];
}

// Storage can be unreadable where the browser blocks it; that reads as having no copies.
function readCopies(): StoredLocalRevision[] {
  try {
    return readLocalRevisions(window.localStorage);
  } catch {
    return [];
  }
}

// A copy with no excerpt shows the start of its body, so copies of one post can be told apart.
function previewOf(revision: StoredLocalRevision): string {
  const excerpt = [revision.custom_excerpt, revision.excerpt].find(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
  let preview = excerpt ?? '';
  if (!preview && typeof revision.lexical === 'string') {
    try {
      preview = lexicalToText(revision.lexical);
    } catch {
      preview = '';
    }
  }
  preview = preview.replace(/\s+/g, ' ').trim();
  return preview.length > PREVIEW_LENGTH ? `${preview.slice(0, PREVIEW_LENGTH)}…` : preview;
}

export default function RestoreScreen() {
  const [revisions] = useState(readCopies);
  const previews = useMemo(
    () => new Map(revisions.map((revision) => [revision.key, previewOf(revision)])),
    [revisions],
  );
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restored, setRestored] = useState<Record<string, Restored>>({});
  const [justRestored, setJustRestored] = useState<string | null>(null);
  const openLinks = useRef(new Map<string, HTMLElement>());
  // Two clicks dispatched in one task both see the same render's state.
  const inFlight = useRef(false);
  const titleIdPrefix = useId();
  const { data: currentUser } = useCurrentUser();
  const { mutateAsync: addPost } = useAddPost();
  const { mutateAsync: addPage } = useAddPage();
  const handleError = useHandleError();

  // The button the writer pressed is replaced by the link, so focus moves to it.
  useEffect(() => {
    if (justRestored) {
      openLinks.current.get(justRestored)?.focus();
    }
  }, [justRestored]);

  const restore = async (revision: StoredLocalRevision) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setRestoring(revision.key);
    try {
      const soleAuthorId =
        currentUser && isAuthorOrContributor(currentUser) ? currentUser.id : undefined;
      const { type, ...post } = restoredPost(revision, { soleAuthorId });
      const created =
        type === 'page'
          ? (await addPage({ page: post })).pages[0]
          : (await addPost({ post })).posts[0];
      setRestored((current) => ({ ...current, [revision.key]: { id: created.id, type } }));
      setJustRestored(revision.key);
      toast.success(`${type === 'page' ? 'Page' : 'Post'} restored`);
    } catch (error) {
      handleError(error);
    } finally {
      inFlight.current = false;
      setRestoring(null);
    }
  };

  return (
    <Box className="size-full" data-sentry-mask="true">
      <Container className="relative flex h-full flex-col" size="page">
        <ListPage>
          <ListPage.Header>
            <PageHeader blurredBackground={false} sticky={false}>
              <PageHeader.Left>
                <PageHeader.Title>Restore posts</PageHeader.Title>
                <PageHeader.Description>
                  Posts are regularly saved locally on this device. If you’ve lost a post, you can
                  restore it from here as long as too much time hasn’t passed.
                </PageHeader.Description>
              </PageHeader.Left>
            </PageHeader>
          </ListPage.Header>
          <ListPage.Body>
            {revisions.length === 0 ? (
              <EmptyIndicator title="No local revisions found.">
                <LucideIcon.History />
              </EmptyIndicator>
            ) : (
              <Table aria-label="Local revisions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-48">Saved</TableHead>
                    <TableHead className="w-48">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revisions.map((revision, index) => {
                    const done = restored[revision.key];
                    const preview = previews.get(revision.key);
                    const titleId = `${titleIdPrefix}-${index}`;
                    return (
                      <TableRow key={revision.key}>
                        <TableCell className="min-w-0">
                          <Text as="div" id={titleId} weight="medium">
                            {typeof revision.title === 'string' && revision.title
                              ? revision.title
                              : '(no title)'}
                          </Text>
                          {preview ? (
                            <Text as="div" size="sm" tone="secondary">
                              {preview}
                            </Text>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Text as="span" className="tabular-nums" size="sm" tone="secondary">
                            {moment(revision.revisionTimestamp).format('MMM D, YYYY HH:mm')}
                          </Text>
                        </TableCell>
                        <TableCell className="text-right">
                          {done ? (
                            <Button
                              ref={(node) => {
                                if (node) {
                                  openLinks.current.set(revision.key, node);
                                } else {
                                  openLinks.current.delete(revision.key);
                                }
                              }}
                              aria-describedby={titleId}
                              size="sm"
                              variant="link"
                              asChild
                            >
                              <AdminLink to={`/editor/${done.type}/${done.id}`}>
                                Open restored {done.type}
                              </AdminLink>
                            </Button>
                          ) : (
                            <Button
                              aria-describedby={titleId}
                              aria-disabled={restoring === revision.key || undefined}
                              // The pressed button stays enabled so focus stays on it if the restore fails.
                              disabled={restoring !== null && restoring !== revision.key}
                              size="sm"
                              variant="outline"
                              onClick={() => void restore(revision)}
                            >
                              {restoring === revision.key ? 'Restoring…' : 'Restore'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ListPage.Body>
        </ListPage>
      </Container>
    </Box>
  );
}
