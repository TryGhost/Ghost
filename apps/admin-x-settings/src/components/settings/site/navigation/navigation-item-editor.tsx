import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import useUrlInput from '../../../../hooks/use-url-input';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '../../../../hooks/site/use-navigation-editor';
import {Field, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {formatUrl} from '../../../../utils/format-url';

export type NavigationItemEditorProps = React.HTMLAttributes<HTMLDivElement> & {
    baseUrl: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    labelPlaceholder?: string
    unstyled?: boolean
    textFieldClasses?: string
    action?: ReactNode
    addItem?: () => void
}

const NavigationItemEditor: React.FC<NavigationItemEditorProps> = ({baseUrl, item, updateItem, addItem, clearError, labelPlaceholder, unstyled, textFieldClasses, action, className, ...props}) => {
    const urlInput = useUrlInput({
        baseUrl,
        nullable: true,
        value: item.url,
        onChange: value => updateItem?.({url: value || ''})
    });

    return (
        <div className={clsx('flex w-full items-start gap-3', className)} data-testid='navigation-item-editor' {...props}>
            <div className="flex flex-1 pt-1">
                <Field className='grow' data-invalid={Boolean(item.errors.label) || undefined}>
                    <FieldLabel className='sr-only' htmlFor={`navigation-label-${item.id}`}>Label</FieldLabel>
                    <Input
                        aria-invalid={Boolean(item.errors.label) || undefined}
                        className={clsx(!unstyled && 'h-[var(--control-height)] rounded-lg border-transparent bg-muted py-2 focus-visible:border-green focus-visible:bg-surface-elevated focus-visible:ring-green/25', unstyled && 'border-0 bg-transparent shadow-none focus-visible:ring-0', textFieldClasses)}
                        id={`navigation-label-${item.id}`}
                        placeholder={labelPlaceholder}
                        value={item.label}
                    onChange={e => updateItem?.({label: e.target.value})}
                    onKeyDown={(e) => {
                        updateItem?.({label: (e.target as HTMLInputElement).value});
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem?.();
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        !!item.errors.label && clearError?.('label');
                    }} />
                    {item.errors.label && <FieldError>{item.errors.label}</FieldError>}
                </Field>
            </div>
            <Field className='flex-1 pt-1' data-invalid={Boolean(item.errors.url) || undefined}>
                <FieldLabel className='sr-only' htmlFor={`navigation-url-${item.id}`}>URL</FieldLabel>
                <Input
                    aria-invalid={Boolean(item.errors.url) || undefined}
                    className={clsx('h-[var(--control-height)] rounded-lg border-transparent bg-muted py-2 focus-visible:border-green focus-visible:bg-surface-elevated focus-visible:ring-green/25', textFieldClasses)}
                    id={`navigation-url-${item.id}`}
                    value={urlInput.displayValue}
                    onBlur={urlInput.commitValue}
                    onChange={event => urlInput.setDisplayValue(event.target.value)}
                    onFocus={urlInput.handleFocus}
                    onKeyDown={(e) => {
                        urlInput.handleKeyDown(e);
                        const urls = formatUrl((e.target as HTMLInputElement).value, baseUrl, true);
                        updateItem?.({url: urls.save || ''});
                    }}
                    onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const urls = formatUrl((e.target as HTMLInputElement).value, baseUrl, true);
                            updateItem?.({url: urls.save || ''});
                            addItem?.();
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        !!item.errors.url && clearError?.('url');
                    }}
                />
                {item.errors.url && <FieldError>{item.errors.url}</FieldError>}
            </Field>
            {action && (
                <Inline align='center' className='h-[calc(var(--control-height)+0.25rem)] shrink-0 translate-y-px pt-1'>
                    {action}
                </Inline>
            )}
        </div>
    );
};

export default NavigationItemEditor;
