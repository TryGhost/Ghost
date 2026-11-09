// Preact components over the SDK's settings elements, for the settings bundle.
import {
  createRemoteComponent,
  type RemoteComponentTypeFromElementConstructor,
} from '@remote-dom/preact';
import {
  CardFileElement,
  CardInputElement,
  CardNoteElement,
  CardRowElement,
  CardSelectElement,
  CardTextareaElement,
  CardToggleElement,
  type CardFile,
} from '@tryghost/app-sdk/cards/settings';

const change = { eventProps: { onChange: { event: 'change' } } } as const;

export const Input = createRemoteComponent(
  'ghost-card-input',
  CardInputElement,
  change,
) as RemoteComponentTypeFromElementConstructor<
  typeof CardInputElement,
  { onChange?: (event: CustomEvent<string>) => void }
>;

export const Textarea = createRemoteComponent(
  'ghost-card-textarea',
  CardTextareaElement,
  change,
) as RemoteComponentTypeFromElementConstructor<
  typeof CardTextareaElement,
  { onChange?: (event: CustomEvent<string>) => void }
>;

export const Select = createRemoteComponent(
  'ghost-card-select',
  CardSelectElement,
  change,
) as RemoteComponentTypeFromElementConstructor<
  typeof CardSelectElement,
  { onChange?: (event: CustomEvent<string>) => void }
>;

export const Toggle = createRemoteComponent(
  'ghost-card-toggle',
  CardToggleElement,
  change,
) as RemoteComponentTypeFromElementConstructor<
  typeof CardToggleElement,
  { onChange?: (event: CustomEvent<boolean>) => void }
>;

export const FileInput = createRemoteComponent(
  'ghost-card-file',
  CardFileElement,
  change,
) as RemoteComponentTypeFromElementConstructor<
  typeof CardFileElement,
  { onChange?: (event: CustomEvent<CardFile>) => void }
>;

export const Row = createRemoteComponent('ghost-card-row', CardRowElement);

export const Note = createRemoteComponent('ghost-card-note', CardNoteElement);
