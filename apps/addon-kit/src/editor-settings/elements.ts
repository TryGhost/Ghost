import {createRemoteElement} from '@remote-dom/core/elements';

interface EditorControlProperties {
    label?: string;
    description?: string;
}

export interface GhEditorInputProperties extends EditorControlProperties {
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
        label: {type: String},
        description: {type: String},
        value: {type: String},
        placeholder: {type: String}
    },
    events: ['change']
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
        label: {type: String},
        description: {type: String},
        checked: {type: Boolean}
    },
    events: ['change']
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
        label: {type: String},
        description: {type: String},
        value: {type: String},
        options: {type: Array}
    },
    events: ['change']
});

const EDITOR_SETTING_ELEMENTS = {
    'gh-editor-input': GhEditorInputElement,
    'gh-editor-toggle': GhEditorToggleElement,
    'gh-editor-select': GhEditorSelectElement
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
        'gh-editor-input': InstanceType<typeof GhEditorInputElement>;
        'gh-editor-toggle': InstanceType<typeof GhEditorToggleElement>;
        'gh-editor-select': InstanceType<typeof GhEditorSelectElement>;
    }
}
