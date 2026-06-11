/**
 * Type declarations for the POC custom-fields repository (THROWAWAY).
 * Lets TypeScript surfaces (admin-x-settings) import the plain-JS repo without
 * allowJs. Delete alongside the rest of poc/custom-fields/.
 */

export type FieldType = 'text' | 'number' | 'boolean' | 'select';

export interface FieldDefinition {
    id: string;
    key: string;
    label: string;
    type: FieldType;
    preset: string | null;
    tier: number;
    helpText: string | null;
    options: string[] | null;
    multiple: boolean;
    archived: boolean;
    createdAt: string;
}

export interface FormPlacement {
    fieldId: string;
    required: boolean;
    placeholder: string | null;
    order: number;
    // Built-in system fields (email, name) appear in the signup list too. They
    // can't be removed; `system` marks them. `enabled` is only used by name
    // (email is always on). Custom placements omit both.
    system?: boolean;
    enabled?: boolean;
}

export interface TypeOption {
    value: FieldType;
    label: string;
    tier: number;
}

export const TYPES: TypeOption[];

export function subscribe(listener: () => void): () => void;

export function deriveKey(label: string, existingKeys?: string[]): string;

export function listFields(): Promise<FieldDefinition[]>;
export function getField(id: string): Promise<FieldDefinition | null>;
export function createField(input: {label: string; type: FieldType} & Partial<FieldDefinition>): Promise<FieldDefinition>;
export function updateField(id: string, patch: Partial<FieldDefinition>): Promise<FieldDefinition | null>;
export function deleteField(id: string): Promise<boolean>;

export function getForm(surface: string): Promise<FormPlacement[]>;
export function setForm(surface: string, placements: FormPlacement[]): Promise<FormPlacement[]>;

export function getValues(memberId: string): Promise<Record<string, unknown>>;
export function setValue(memberId: string, fieldId: string, value: unknown): Promise<Record<string, unknown>>;

export function getSetting(key: string): Promise<unknown>;
export function setSetting(key: string, value: unknown): Promise<unknown>;

export function isDismissed(memberId: string, key: string): Promise<boolean>;
export function setDismissed(memberId: string, key: string, value?: boolean): Promise<void>;

export function resetToSeed(): Promise<unknown>;
