import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import useUrlInput from '../../../../hooks/use-url-input';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '../../../../hooks/site/use-navigation-editor';
import {Field, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {TextField} from '@tryghost/admin-x-design-system';
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
                <TextField
                    className={textFieldClasses}
                    containerClassName="grow"
                    error={!!item.errors.label}
                    hint={item.errors.label}
                    placeholder={labelPlaceholder}
                    title='Label'
                    unstyled={unstyled}
                    value={item.label}
                    hideTitle
                    onChange={e => updateItem?.({label: e.target.value})}
                    onKeyDown={(e) => {
                        updateItem?.({label: (e.target as HTMLInputElement).value});
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem?.();
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                        !!item.errors.label && clearError?.('label');
                    }}
                />
            </div>
            <Field className='flex-1 pt-1' data-invalid={Boolean(item.errors.url) || undefined}>
                <FieldLabel className='sr-only' htmlFor={`navigation-url-${item.id}`}>URL</FieldLabel>
                <Input
                    aria-invalid={Boolean(item.errors.url) || undefined}
                    className={textFieldClasses}
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
            {action}
        </div>
    );
};

export default NavigationItemEditor;
