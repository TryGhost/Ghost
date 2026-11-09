import { createRemoteElement } from '@remote-dom/core/elements';

/**
 * The elements a card's settings panel is made of. The panel renders them into its hidden
 * document; Ghost draws each one with the editor's own controls and sends the author's input
 * back as a `change` event.
 */

interface FieldProperties {
  label?: string;
  description?: string;
}

export interface CardInputProperties extends FieldProperties {
  value?: string;
  placeholder?: string;
}

export interface CardSelectOption {
  label: string;
  value: string;
}

export interface CardSelectProperties extends FieldProperties {
  value?: string;
  options?: CardSelectOption[];
}

export interface CardToggleProperties extends FieldProperties {
  checked?: boolean;
}

/** A file the author picked. Ghost reads it in the editor, up to 1 MB, and passes its bytes. */
export interface CardFile {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
}

export interface CardFileProperties extends FieldProperties {
  accept?: string;
  buttonLabel?: string;
}

export interface CardNoteProperties {
  tone?: 'info' | 'error';
}

type NoAttributes = Record<string, never>;
type NoMethods = Record<string, never>;

const fieldProperties = {
  label: { type: String },
  description: { type: String },
} as const;

export const CardInputElement = createRemoteElement<
  CardInputProperties,
  NoMethods,
  NoAttributes,
  { change(event: CustomEvent<string>): void }
>({
  properties: { ...fieldProperties, value: { type: String }, placeholder: { type: String } },
  events: ['change'],
});

export const CardTextareaElement = createRemoteElement<
  CardInputProperties,
  NoMethods,
  NoAttributes,
  { change(event: CustomEvent<string>): void }
>({
  properties: { ...fieldProperties, value: { type: String }, placeholder: { type: String } },
  events: ['change'],
});

export const CardSelectElement = createRemoteElement<
  CardSelectProperties,
  NoMethods,
  NoAttributes,
  { change(event: CustomEvent<string>): void }
>({
  properties: { ...fieldProperties, value: { type: String }, options: { type: Array } },
  events: ['change'],
});

export const CardToggleElement = createRemoteElement<
  CardToggleProperties,
  NoMethods,
  NoAttributes,
  { change(event: CustomEvent<boolean>): void }
>({
  properties: { ...fieldProperties, checked: { type: Boolean } },
  events: ['change'],
});

export const CardFileElement = createRemoteElement<
  CardFileProperties,
  NoMethods,
  NoAttributes,
  { change(event: CustomEvent<CardFile>): void }
>({
  properties: { ...fieldProperties, accept: { type: String }, buttonLabel: { type: String } },
  events: ['change'],
});

/** Lays its children out side by side. */
export const CardRowElement = createRemoteElement();

/** A line of text in the panel, such as a hint or an error. Its text is its children. */
export const CardNoteElement = createRemoteElement<CardNoteProperties>({
  properties: { tone: { type: String } },
});

const ELEMENTS = {
  'ghost-card-input': CardInputElement,
  'ghost-card-textarea': CardTextareaElement,
  'ghost-card-select': CardSelectElement,
  'ghost-card-toggle': CardToggleElement,
  'ghost-card-file': CardFileElement,
  'ghost-card-row': CardRowElement,
  'ghost-card-note': CardNoteElement,
} as const;

/** Defines the settings elements in this document. Safe to call more than once. */
export function registerCardSettingsElements(): void {
  for (const [tag, element] of Object.entries(ELEMENTS)) {
    if (!customElements.get(tag)) {
      customElements.define(tag, element);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ghost-card-input': InstanceType<typeof CardInputElement>;
    'ghost-card-textarea': InstanceType<typeof CardTextareaElement>;
    'ghost-card-select': InstanceType<typeof CardSelectElement>;
    'ghost-card-toggle': InstanceType<typeof CardToggleElement>;
    'ghost-card-file': InstanceType<typeof CardFileElement>;
    'ghost-card-row': InstanceType<typeof CardRowElement>;
    'ghost-card-note': InstanceType<typeof CardNoteElement>;
  }
}
