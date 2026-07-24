import { type ReactNode, useId, useState } from "react";
import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Field,
    FieldLabel,
    Input,
} from "@tryghost/shade/components";

/**
 * Confirm/input prompt dialogs for the theme code editor — the Shade
 * replacement for the legacy NiceModal-driven theme-editor-confirm-modal.tsx
 * and theme-editor-input-modal.tsx, keeping their testids. Driven by
 * use-theme-editor-prompts.tsx (kept separate so this file only exports
 * components).
 */

export interface ThemeEditorConfirmProps {
    title: string;
    prompt: ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    destructive?: boolean;
}

export interface ThemeEditorInputProps {
    title: string;
    prompt?: ReactNode;
    fieldTitle: string;
    initialValue: string;
    placeholder?: string;
    cancelLabel?: string;
    okLabel?: string;
}

export type ThemeEditorConfirmState = ThemeEditorConfirmProps & { resolve: (result: boolean) => void };
export type ThemeEditorInputState = ThemeEditorInputProps & { resolve: (result: string | null) => void };

export function ThemeEditorConfirmDialog({ state }: { state: ThemeEditorConfirmState }) {
    const { title, prompt, cancelLabel = "Cancel", okLabel = "OK", destructive, resolve } = state;

    return (
        <Dialog open onOpenChange={(open) => !open && resolve(false)}>
            <DialogContent aria-describedby={undefined} className="max-w-[540px]" data-testid="theme-editor-confirm-modal">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="py-2 text-sm">{prompt}</div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => resolve(false)}>{cancelLabel}</Button>
                    <Button variant={destructive ? "destructive" : "default"} onClick={() => resolve(true)}>{okLabel}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ThemeEditorInputDialog({ state }: { state: ThemeEditorInputState }) {
    const { title, prompt, fieldTitle, initialValue, placeholder, cancelLabel = "Cancel", okLabel = "Continue", resolve } = state;
    const [value, setValue] = useState(initialValue);
    const id = useId();

    return (
        <Dialog open onOpenChange={(open) => !open && resolve(null)}>
            <DialogContent aria-describedby={undefined} className="max-w-[540px]" data-testid="theme-editor-input-modal">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-2 text-sm">
                    {prompt}
                    <Field>
                        <FieldLabel htmlFor={id}>{fieldTitle}</FieldLabel>
                        <Input
                            id={id}
                            placeholder={placeholder}
                            value={value}
                            autoFocus
                            onChange={(event) => setValue(event.target.value)}
                        />
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => resolve(null)}>{cancelLabel}</Button>
                    <Button disabled={!value.trim()} variant="default" onClick={() => resolve(value)}>{okLabel}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
