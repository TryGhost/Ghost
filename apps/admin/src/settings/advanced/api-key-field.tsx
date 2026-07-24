import { type ReactNode } from "react";
import {
    Button,
    CopyField,
    CopyFieldActions,
    CopyFieldContent,
    CopyFieldCopyButton,
    CopyFieldLabel,
    CopyFieldValue,
} from "@tryghost/shade/components";
import { Stack } from "@tryghost/shade/primitives";

/**
 * The one API-key copy row for every place a key appears (Zapier, Transistor,
 * Content API, custom integrations): shade CopyField with the legacy
 * hover-reveal Copy ("Copied" flash) / Regenerate actions and the
 * regenerated-hint line, replacing the legacy api-keys.tsx.
 */

export interface APIKeyFieldProps {
    id: string;
    label?: string;
    text?: string;
    hint?: ReactNode;
    onRegenerate?: () => void;
}

export function APIKeyField({ id, label, text = "", hint, onRegenerate }: APIKeyFieldProps) {
    return (
        <CopyField className="mb-3" data-testid={id} value={text}>
            {label && <CopyFieldLabel>{label}</CopyFieldLabel>}
            <CopyFieldContent>
                <Stack className="min-w-0" gap="none">
                    <CopyFieldValue />
                    {hint}
                </Stack>
                <CopyFieldActions>
                    {onRegenerate && <Button size="sm" type="button" variant="outline" onClick={onRegenerate}>Regenerate</Button>}
                    <CopyFieldCopyButton />
                </CopyFieldActions>
            </CopyFieldContent>
        </CopyField>
    );
}

export function APIKeys({ keys }: { keys: APIKeyFieldProps[] }) {
    return (
        <Stack data-testid="api-keys" gap="none">
            {keys.map((key) => <APIKeyField key={key.id} {...key} />)}
        </Stack>
    );
}
