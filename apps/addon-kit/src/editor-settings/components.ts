import {
  createRemoteComponent,
  type RemoteComponentTypeFromElementConstructor,
} from '@remote-dom/preact';
import { registerGhostConnectionHook } from '../addon/connect.ts';
import {
  GhEditorInputElement,
  GhEditorFileInputElement,
  GhEditorSelectElement,
  GhEditorToggleElement,
  registerEditorSettingsElements,
} from './elements.ts';

registerEditorSettingsElements();
registerGhostConnectionHook();

export const GhEditorInput = createRemoteComponent('gh-editor-input', GhEditorInputElement, {
  eventProps: { onChange: { event: 'change' } },
}) as RemoteComponentTypeFromElementConstructor<
  typeof GhEditorInputElement,
  { onChange?: (event: CustomEvent<string>) => void }
>;

export const GhEditorToggle = createRemoteComponent('gh-editor-toggle', GhEditorToggleElement, {
  eventProps: { onChange: { event: 'change' } },
}) as RemoteComponentTypeFromElementConstructor<
  typeof GhEditorToggleElement,
  { onChange?: (event: CustomEvent<boolean>) => void }
>;

export const GhEditorSelect = createRemoteComponent('gh-editor-select', GhEditorSelectElement, {
  eventProps: { onChange: { event: 'change' } },
}) as RemoteComponentTypeFromElementConstructor<
  typeof GhEditorSelectElement,
  { onChange?: (event: CustomEvent<string>) => void }
>;

export const GhEditorFileInput = createRemoteComponent(
  'gh-editor-file-input',
  GhEditorFileInputElement,
  {
    eventProps: { onChange: { event: 'change' } },
  },
) as RemoteComponentTypeFromElementConstructor<
  typeof GhEditorFileInputElement,
  { onChange?: (event: CustomEvent<import('./elements.ts').GhEditorFile>) => void }
>;
