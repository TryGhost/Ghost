import type { ThemeFilePatch } from '@/builder/workspaces/theme/theme-patch';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';
import type { RouteCompatibility } from './route-compatibility';
import type { ThemeDraft } from '@/builder/workspaces/theme/theme-state';
import type { ThemePublicationReview } from '@/builder/workspaces/theme/theme-workspace';
import type { PublishResult } from '@/builder/core/workspace';

export type CanvasPublicationReview = ThemePublicationReview & {
  pending: { text: boolean; settings: boolean };
};
export type CanvasPublishOptions = { expectedRevision: string; copyName?: string };
export type CanvasPublishResult = PublishResult & {
  previewWarning?: string;
  render?: CanvasEditorRender;
};
export type CanvasPublicationActions = {
  openReview: (expectedRevision?: string) => CanvasPublicationReview;
  publish: (options: CanvasPublishOptions) => Promise<CanvasPublishResult>;
};

export type CanvasPatch = {
  expectedRevision: string;
  expectedDataGeneration: number;
  files?: ThemeFilePatch[];
  settings?: Record<string, unknown>;
};
export type CanvasPatchValidation = {
  valid: true;
  revision: string;
  candidateRevision: string;
  dataGeneration: number;
  unchanged: boolean;
  paths: string[];
  settings: string[];
};
export type CanvasEdit = {
  marker: string;
  tagName: string;
  newText: string;
  expectedRevision: string;
  expectedDataGeneration?: number;
};
export type CanvasHistoryRestore = {
  checkpointId: string;
  expectedRevision: string;
  expectedDataGeneration: number;
};
export type CanvasHistory = {
  available: true;
  entries: Array<{
    id: string;
    revision: string;
    label: string;
    createdAt: string;
    current: boolean;
  }>;
  undoId: string | null;
  redoId: string | null;
};
export type CanvasPost = { id: string; title: string; url: string };
export type CanvasPostPage = { posts: CanvasPost[]; nextPage: number | null };
export type CanvasPostSelection = {
  id: string;
  expectedRevision: string;
  expectedDataGeneration: number;
};
export type CanvasEditorRender = {
  revision: string;
  dataGeneration: number;
  dataSnapshot: string;
  renderKey: string;
  workspaceId?: string;
  unchanged?: boolean;
  html: { home: string; post?: string };
  inlineTextTargets: Record<string, string>;
  editMarkerAttribute: string;
  editedFile?: { path: string; content: string };
  sourceChanges?: Record<string, string | null>;
  assets?: NonNullable<PreviewDocument['assets']>;
  routes?: { home: string; post?: string };
  representativePost?: CanvasPost | null;
};
export class CanvasRejectedError extends Error {
  readonly code: string;
  readonly details?: unknown;
  constructor(message: string, code = 'change_rejected', details?: unknown) {
    super(message);
    this.name = 'CanvasRejectedError';
    this.code = code;
    this.details = details;
  }
}
export type CanvasDriver = {
  render: (edit?: CanvasEdit) => Promise<CanvasEditorRender>;
  applyThemePatch: (patch: CanvasPatch, signal?: AbortSignal) => Promise<CanvasEditorRender>;
  validateThemePatch?: (patch: CanvasPatch, signal?: AbortSignal) => Promise<CanvasPatchValidation>;
  readHistory?: () => CanvasHistory;
  restoreHistory?: (
    input: CanvasHistoryRestore,
    signal?: AbortSignal,
  ) => Promise<CanvasEditorRender>;
  listPosts?: (page: number, signal?: AbortSignal) => Promise<CanvasPostPage>;
  selectPost?: (input: CanvasPostSelection, signal?: AbortSignal) => Promise<CanvasEditorRender>;
  publish?: (signal: AbortSignal, options: CanvasPublishOptions) => Promise<CanvasPublishResult>;
  loadAssets: () => Promise<NonNullable<PreviewDocument['assets']>>;
  refresh?: (accepted: CanvasEditorRender) => Promise<CanvasEditorRender>;
  subscribe?: (deliver: (render: CanvasEditorRender) => void) => () => void;
  dispose: () => void;
};
export type CanvasSource = {
  fixture: boolean;
  id: string;
  label: string;
  version: string;
  revision: string;
  siteUrl: string;
  routes: { home: string; post?: string };
  files: Record<string, string>;
  routing: RouteCompatibility;
  createDriver: () => CanvasDriver;
  refreshLabel?: (snapshot: string) => string;
  editor?: {
    readDraft: () => ThemeDraft;
    state: () => Record<string, unknown>;
    readPublicationReview?: () => ThemePublicationReview;
    openPublicationReview?: (review: CanvasPublicationReview) => void;
  };
  posts?: {
    selected: CanvasPost | null;
    list: (page: number, signal: AbortSignal) => Promise<CanvasPostPage>;
  };
};
