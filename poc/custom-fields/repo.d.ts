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
}

export interface TypeOption {
    value: FieldType;
    label: string;
    tier: number;
}

export interface PresetOption {
    preset: string;
    label: string;
    type: FieldType;
}

export const TYPES: TypeOption[];
export const PRESETS: PresetOption[];

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

export function resetToSeed(): Promise<unknown>;
