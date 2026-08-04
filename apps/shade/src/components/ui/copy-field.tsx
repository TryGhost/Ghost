import * as React from 'react';

import {Inline, Stack, Text} from '@/components/primitives';
import {Button, type ButtonProps} from '@/components/ui/button';
import {inputSurface} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';

type CopyFieldContextValue = {
    copied: boolean;
    copy: () => Promise<void>;
    disabled: boolean;
    labelId: string;
    value: string;
};

const CopyFieldContext = React.createContext<CopyFieldContextValue | null>(null);

function useCopyField() {
    const context = React.useContext(CopyFieldContext);

    if (!context) {
        throw new Error('CopyField subcomponents must be used within CopyField');
    }

    return context;
}

interface CopyFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    disabled?: boolean;
    value: string;
}

const CopyField = React.forwardRef<HTMLDivElement, CopyFieldProps>(({children, className, disabled = false, value, ...props}, ref) => {
    const [copied, setCopied] = React.useState(false);
    const labelId = React.useId();
    const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setCopied(false);

        if (resetTimer.current) {
            clearTimeout(resetTimer.current);
            resetTimer.current = null;
        }
    }, [value]);

    React.useEffect(() => {
        return () => {
            if (resetTimer.current) {
                clearTimeout(resetTimer.current);
            }
        };
    }, []);

    const copy = React.useCallback(async () => {
        if (disabled) {
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);

            if (resetTimer.current) {
                clearTimeout(resetTimer.current);
            }

            resetTimer.current = setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    }, [disabled, value]);

    const contextValue = React.useMemo(() => ({copied, copy, disabled, labelId, value}), [copied, copy, disabled, labelId, value]);

    return (
        <CopyFieldContext.Provider value={contextValue}>
            <Stack
                ref={ref}
                className={cn('group/copy-field w-full', className)}
                data-disabled={disabled || undefined}
                data-slot="copy-field"
                gap="xs"
                {...props}
            >
                {children}
            </Stack>
        </CopyFieldContext.Provider>
    );
});
CopyField.displayName = 'CopyField';

const CopyFieldLabel = React.forwardRef<HTMLElement, React.ComponentProps<typeof Text>>(({className, id, ...props}, ref) => {
    const {labelId} = useCopyField();

    return (
        <Text
            ref={ref}
            as="div"
            className={cn('text-control! font-medium group-data-[disabled=true]/copy-field:opacity-50', className)}
            data-slot="copy-field-label"
            id={id || labelId}
            leading="snug"
            {...props}
        />
    );
});
CopyFieldLabel.displayName = 'CopyFieldLabel';

const CopyFieldContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            inputSurface('within'),
            'group/copy-field-content relative flex h-(--control-height) w-full items-center overflow-hidden bg-control-readonly-surface px-3 py-1 group-data-[disabled=true]/copy-field:cursor-not-allowed group-data-[disabled=true]/copy-field:opacity-50',
            className
        )}
        data-slot="copy-field-content"
        {...props}
    />
));
CopyFieldContent.displayName = 'CopyFieldContent';

const CopyFieldValue = React.forwardRef<HTMLElement, React.ComponentProps<typeof Text>>(({children, className, ...props}, ref) => {
    const {disabled, labelId, value} = useCopyField();

    return (
        <Text
            ref={ref}
            aria-disabled={disabled || undefined}
            aria-labelledby={props['aria-label'] || props['aria-labelledby'] ? props['aria-labelledby'] : labelId}
            aria-readonly="true"
            as="div"
            className={cn('min-w-0 truncate pr-2 text-muted-foreground', className)}
            data-slot="copy-field-value"
            leading="snug"
            role="textbox"
            tabIndex={disabled ? undefined : 0}
            {...props}
        >
            {children ?? value}
        </Text>
    );
});
CopyFieldValue.displayName = 'CopyFieldValue';

const CopyFieldActions = React.forwardRef<HTMLElement, React.ComponentProps<typeof Inline>>(({className, ...props}, ref) => (
    <Inline
        ref={ref}
        className={cn(
            'absolute top-1/2 right-[1px] -translate-y-1/2 gap-px bg-control-readonly-surface pl-1 transition-opacity md:pointer-events-none md:opacity-0 md:group-focus-within/copy-field-content:pointer-events-auto md:group-focus-within/copy-field-content:opacity-100 md:group-hover/copy-field-content:pointer-events-auto md:group-hover/copy-field-content:opacity-100 [&_button]:h-7 [&_button]:rounded-sm [&_button:not([data-slot=copy-field-copy-button])]:bg-control-readonly-surface [&_button:not([data-slot=copy-field-copy-button])]:hover:bg-secondary',
            className
        )}
        data-slot="copy-field-actions"
        gap="none"
        {...props}
    />
));
CopyFieldActions.displayName = 'CopyFieldActions';

interface CopyFieldCopyButtonProps extends Omit<ButtonProps, 'children'> {
    children?: React.ReactNode;
    copiedLabel?: React.ReactNode;
}

const CopyFieldCopyButton = React.forwardRef<HTMLButtonElement, CopyFieldCopyButtonProps>(({children = 'Copy', className, copiedLabel = 'Copied', disabled, onClick, ...props}, ref) => {
    const {copied, copy, disabled: fieldDisabled} = useCopyField();

    return (
        <Button
            ref={ref}
            className={cn('bg-surface-elevated hover:border-border-strong/40 hover:bg-surface-elevated', className)}
            disabled={fieldDisabled || disabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={async (event) => {
                await copy();
                onClick?.(event);
            }}
            {...props}
            data-slot="copy-field-copy-button"
        >
            {copied ? copiedLabel : children}
        </Button>
    );
});
CopyFieldCopyButton.displayName = 'CopyFieldCopyButton';

export {
    CopyField,
    CopyFieldActions,
    CopyFieldContent,
    CopyFieldCopyButton,
    CopyFieldLabel,
    CopyFieldValue
};
export type {CopyFieldProps};
