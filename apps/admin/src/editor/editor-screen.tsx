import { useCallback, useRef, useState } from 'react';
import { AdminLink } from '@/shared/admin-link';
import { NotFound } from '@/shared/not-found';
import { useParams } from '@tryghost/admin-x-framework';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { Inline, Stack } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { type PageEditorRecord, useEditorPage } from '@tryghost/admin-x-framework/api/pages';
import { type PostEditorRecord, useEditorPost } from '@tryghost/admin-x-framework/api/posts';
import { isAdminUser, isEditorUser, isOwnerUser } from '@tryghost/admin-x-framework/api/users';
import type { KoenigInstance } from '@/settings/components/koenig-loader';
import type { CardConfigPostSource, PostType } from './card-config';
import { PostEditor } from './post-editor';
import { usePostCardConfig } from './use-post-card-config';
import { usePostSnippets } from './use-post-snippets';

type EditorRecord = PostEditorRecord | PageEditorRecord;

function EditorLoading() {
  return (
    <Stack align="center" className="h-full" justify="center">
      <LoadingIndicator size="lg" />
    </Stack>
  );
}

function EditorHeader({ postType }: { postType: PostType }) {
  const listLabel = postType === 'page' ? 'Pages' : 'Posts';

  return (
    <Inline className="shrink-0 px-4 py-3" gap="sm">
      <Button size="sm" variant="ghost" asChild>
        <AdminLink to={postType === 'page' ? '/pages' : '/posts'}>
          <LucideIcon.ArrowLeft />
          {listLabel}
        </AdminLink>
      </Button>
    </Inline>
  );
}

// Keyed on the record so navigating to another post remounts with fresh state;
// edits stay in memory until the save engine attaches to the callbacks below
function EditorSurface({ postType, record }: { postType: PostType; record?: EditorRecord }) {
  const { data: currentUser } = useCurrentUser();
  const showExcerpt = useFeatureFlag('editorExcerpt');
  const [title, setTitle] = useState(() =>
    record?.title === '(Untitled)' ? '' : (record?.title ?? ''),
  );
  const [excerpt, setExcerpt] = useState(() => record?.custom_excerpt ?? '');
  const lexicalRef = useRef<unknown>(null);
  const secondaryLexicalRef = useRef<unknown>(null);
  const editorApiRef = useRef<KoenigInstance | null>(null);
  const secondaryApiRef = useRef<KoenigInstance | null>(null);

  const canManageSnippets =
    !!currentUser &&
    (isOwnerUser(currentUser) || isAdminUser(currentUser) || isEditorUser(currentUser));
  const { snippets, createSnippet, deleteSnippet, snippetDialog } = usePostSnippets({
    canManage: canManageSnippets,
  });

  const [cardConfigPost] = useState<CardConfigPostSource>(() => ({
    displayName: postType,
    showTitleAndFeatureImage:
      record && 'show_title_and_feature_image' in record
        ? record.show_title_and_feature_image
        : undefined,
    visibility: record?.visibility,
  }));
  const cardConfig = usePostCardConfig({
    post: cardConfigPost,
    snippets,
    createSnippet,
    deleteSnippet,
  });

  const onLexicalChange = useCallback((lexical: unknown) => {
    lexicalRef.current = lexical;
  }, []);
  const onSecondaryChange = useCallback((lexical: unknown) => {
    secondaryLexicalRef.current = lexical;
  }, []);
  const registerEditorApi = useCallback((api: KoenigInstance | null) => {
    editorApiRef.current = api;
  }, []);
  const registerSecondaryApi = useCallback((api: KoenigInstance | null) => {
    secondaryApiRef.current = api;
  }, []);

  if (!cardConfig) {
    return <EditorLoading />;
  }

  return (
    <Stack className="h-full" gap="none">
      <EditorHeader postType={postType} />
      <div className="min-h-0 flex-1">
        <PostEditor
          autofocusTitle={!record}
          cardConfig={cardConfig}
          excerpt={excerpt}
          initialLexical={record?.lexical ?? null}
          postType={postType}
          registerEditorApi={registerEditorApi}
          registerSecondaryApi={registerSecondaryApi}
          showExcerpt={showExcerpt}
          title={title}
          onExcerptChange={setExcerpt}
          onLexicalChange={onLexicalChange}
          onSecondaryChange={onSecondaryChange}
          onTitleChange={setTitle}
        />
      </div>
      {snippetDialog}
    </Stack>
  );
}

function ExistingPostEditor({ postType, id }: { postType: PostType; id: string }) {
  const postQuery = useEditorPost(id, { enabled: postType === 'post' });
  const pageQuery = useEditorPage(id, { enabled: postType === 'page' });
  const query = postType === 'page' ? pageQuery : postQuery;
  const record: EditorRecord | undefined =
    postType === 'page' ? pageQuery.data?.pages[0] : postQuery.data?.posts[0];

  if (query.isPending) {
    return <EditorLoading />;
  }

  if (!record) {
    return <NotFound />;
  }

  return <EditorSurface key={record.id} postType={postType} record={record} />;
}

export default function EditorScreen() {
  const editorPath = useParams()['*'] ?? '';
  const [typeSegment, id] = editorPath.split('/');
  const postType: PostType = typeSegment === 'page' ? 'page' : 'post';

  if (id) {
    return <ExistingPostEditor id={id} postType={postType} />;
  }

  return <EditorSurface key={postType} postType={postType} />;
}
