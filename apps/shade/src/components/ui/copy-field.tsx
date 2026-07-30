import * as React from 'react';

import {Inline, Stack, Text} from '@/components/primitives';
import {Button, type ButtonProps} from '@/components/ui/button';
import {cn} from '@/lib/utils';

type CopyFieldContextValue = {
    copied: boolean;
    copy: () => Promise<void>;
    disabled: boolean;
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

    const contextValue = React.useMemo(() => ({copied, copy, disabled, value}), [copied, copy, disabled, value]);

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

const CopyFieldLabel = React.forwardRef<HTMLElement, React.ComponentProps<typeof Text>>(({className, ...props}, ref) => (
    <Text
        ref={ref}
        as="div"
        className={cn('group-data-[disabled=true]/copy-field:opacity-50', className)}
        data-slot="copy-field-label"
        leading="snug"
        size="sm"
        weight="semibold"
        {...props}
    />
));
CopyFieldLabel.displayName = 'CopyFieldLabel';

const CopyFieldContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn(
            'group/copy-field-content relative flex min-h-9 w-full items-center overflow-hidden border-b border-transparent py-1 transition-colors group-data-[disabled=true]/copy-field:opacity-50 focus-within:border-border-default hover:border-border-default',
            className
        )}
        data-slot="copy-field-content"
        {...props}
    />
));
CopyFieldContent.displayName = 'CopyFieldContent';

const CopyFieldValue = React.forwardRef<HTMLElement, React.ComponentProps<typeof Text>>(({children, className, ...props}, ref) => {
    const {value} = useCopyField();

    return (
        <Text
            ref={ref}
            as="div"
            className={cn('min-w-0 truncate pr-2', className)}
            data-slot="copy-field-value"
            leading="snug"
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
            'absolute top-1/2 right-0 -translate-y-1/2 bg-background pl-1 transition-opacity md:pointer-events-none md:opacity-0 md:group-focus-within/copy-field-content:pointer-events-auto md:group-focus-within/copy-field-content:opacity-100 md:group-hover/copy-field-content:pointer-events-auto md:group-hover/copy-field-content:opacity-100',
            className
        )}
        data-slot="copy-field-actions"
        gap="xs"
        {...props}
    />
));
CopyFieldActions.displayName = 'CopyFieldActions';

interface CopyFieldCopyButtonProps extends Omit<ButtonProps, 'children'> {
    children?: React.ReactNode;
    copiedLabel?: React.ReactNode;
}

const CopyFieldCopyButton = React.forwardRef<HTMLButtonElement, CopyFieldCopyButtonProps>(({children = 'Copy', copiedLabel = 'Copied', disabled, onClick, ...props}, ref) => {
    const {copied, copy, disabled: fieldDisabled} = useCopyField();

    return (
        <Button
            ref={ref}
            disabled={fieldDisabled || disabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={async (event) => {
                await copy();
                onClick?.(event);
            }}
            {...props}
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
