import { createRemoteElement } from '@remote-dom/core/elements';

interface EditorControlProperties {
  label?: string;
  description?: string;
}

/** Two equal-width fields in an editor settings panel. */
export const GhEditorRowElement = createRemoteElement();

export interface GhEditorInputProperties extends EditorControlProperties {
  multiline?: boolean;
  value?: string;
  placeholder?: string;
}

interface GhEditorInputEventListeners {
  change(event: CustomEvent<string>): void;
}

export const GhEditorInputElement = createRemoteElement<
  GhEditorInputProperties,
  Record<string, never>,
  Record<string, never>,
  GhEditorInputEventListeners
>({
  properties: {
    label: { type: String },
    description: { type: String },
    value: { type: String },
    placeholder: { type: String },
    multiline: { type: Boolean },
  },
  events: ['change'],
});

export interface GhEditorToggleProperties extends EditorControlProperties {
  checked?: boolean;
}

interface GhEditorToggleEventListeners {
  change(event: CustomEvent<boolean>): void;
}

export const GhEditorToggleElement = createRemoteElement<
  GhEditorToggleProperties,
  Record<string, never>,
  Record<string, never>,
  GhEditorToggleEventListeners
>({
  properties: {
    label: { type: String },
    description: { type: String },
    checked: { type: Boolean },
  },
  events: ['change'],
});

export interface GhEditorSelectOption {
  label: string;
  value: string;
}

export interface GhEditorSelectProperties extends EditorControlProperties {
  value?: string;
  options?: GhEditorSelectOption[];
}

interface GhEditorSelectEventListeners {
  change(event: CustomEvent<string>): void;
}

export const GhEditorSelectElement = createRemoteElement<
  GhEditorSelectProperties,
  Record<string, never>,
  Record<string, never>,
  GhEditorSelectEventListeners
>({
  properties: {
    label: { type: String },
    description: { type: String },
    value: { type: String },
    options: { type: Array },
  },
  events: ['change'],
});

export interface GhEditorFile {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
}

export interface GhEditorFileInputProperties extends EditorControlProperties {
  accept?: string;
  maxBytes?: number;
}

interface GhEditorFileInputEventListeners {
  change(event: CustomEvent<GhEditorFile>): void;
}

export const GhEditorFileInputElement = createRemoteElement<
  GhEditorFileInputProperties,
  Record<string, never>,
  Record<string, never>,
  GhEditorFileInputEventListeners
>({
  properties: {
    label: { type: String },
    description: { type: String },
    accept: { type: String },
    maxBytes: { type: Number },
  },
  events: ['change'],
});

export interface GhMediaReference {
  url: string;
  mime_type: string;
  byte_length: number;
}
export interface GhMediaUploadProperties extends EditorControlProperties {
  format?: 'audio' | 'video';
  url?: string;
}
export const GhMediaUploadElement = createRemoteElement<
  GhMediaUploadProperties,
  Record<string, never>,
  Record<string, never>,
  { change(event: CustomEvent<GhMediaReference | null>): void }
>({
  properties: {
    label: { type: String },
    description: { type: String },
    format: { type: String },
    url: { type: String },
  },
  events: ['change'],
});

const EDITOR_SETTING_ELEMENTS = {
  'gh-editor-row': GhEditorRowElement,
  'gh-media-upload': GhMediaUploadElement,
  'gh-editor-input': GhEditorInputElement,
  'gh-editor-toggle': GhEditorToggleElement,
  'gh-editor-select': GhEditorSelectElement,
  'gh-editor-file-input': GhEditorFileInputElement,
} as const;

export function registerEditorSettingsElements(): void {
  for (const [tag, element] of Object.entries(EDITOR_SETTING_ELEMENTS)) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gh-editor-row': InstanceType<typeof GhEditorRowElement>;
    'gh-media-upload': InstanceType<typeof GhMediaUploadElement>;
    'gh-editor-input': InstanceType<typeof GhEditorInputElement>;
    'gh-editor-toggle': InstanceType<typeof GhEditorToggleElement>;
    'gh-editor-select': InstanceType<typeof GhEditorSelectElement>;
    'gh-editor-file-input': InstanceType<typeof GhEditorFileInputElement>;
  }
}
