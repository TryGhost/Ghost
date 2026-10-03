import type { ThemeFilePatch } from '@/builder/workspaces/theme/theme-patch';
import type { PreviewDocument } from '@/builder/workspaces/theme/preview/preview-document';
import type { RouteCompatibility } from './route-compatibility';

export type CanvasPatch = {
  expectedRevision: string;
  expectedDataGeneration: number;
  files?: ThemeFilePatch[];
  settings?: Record<string, unknown>;
};
export type CanvasEdit = {
  marker: string;
  tagName: string;
  newText: string;
  expectedRevision: string;
  expectedDataGeneration?: number;
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
};
export class CanvasRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanvasRejectedError';
  }
}
export type CanvasDriver = {
  render: (edit?: CanvasEdit) => Promise<CanvasEditorRender>;
  applyThemePatch: (patch: CanvasPatch) => Promise<CanvasEditorRender>;
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
};
