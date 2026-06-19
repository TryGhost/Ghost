import NavigationIconUpload from './navigation-icon-upload';
import NavigationVisibilityDropdown from './navigation-visibility-dropdown';
import React, {type ReactNode} from 'react';
import clsx from 'clsx';
<<<<<<< HEAD:apps/admin/src/settings/app/components/settings/site/navigation/navigation-item-editor.tsx
import useUrlInput from '@/settings/app/hooks/use-url-input';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '@/settings/app/hooks/site/use-navigation-editor';
import {Field, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {formatUrl} from '@/settings/app/utils/format-url';
=======
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '../../../../hooks/site/use-navigation-editor';
import {TextField, URLTextField, formatUrl} from '@tryghost/admin-x-design-system';
import {navigationColumnClasses, navigationFieldOffsetClass, navigationRowClasses} from './navigation-layout';
>>>>>>> 8df92567a7 (✨ Added icons and visibility controls to navigation):apps/admin-x-settings/src/components/settings/site/navigation/navigation-item-editor.tsx

export type NavigationItemEditorProps = React.HTMLAttributes<HTMLDivElement> & {
    baseUrl: string;
    idPrefix: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    uploadIcon?: (file: File) => Promise<string | undefined>;
    labelPlaceholder?: string
    unstyled?: boolean
    textFieldClasses?: string
    action?: ReactNode
    addItem?: () => void
    showIcon: boolean
    showPaidVisibility: boolean
    showVisibility: boolean
}

<<<<<<< HEAD:apps/admin/src/settings/app/components/settings/site/navigation/navigation-item-editor.tsx
<<<<<<< HEAD:apps/admin/src/settings/app/components/settings/site/navigation/navigation-item-editor.tsx
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
                        className={clsx(unstyled && 'border-0 bg-transparent shadow-none focus-visible:ring-0', textFieldClasses)}
                        id={`navigation-label-${item.id}`}
                        placeholder={labelPlaceholder}
                        value={item.label}
=======
const NavigationItemEditor: React.FC<NavigationItemEditorProps> = ({baseUrl, idPrefix, item, updateItem, uploadIcon, addItem, clearError, labelPlaceholder, unstyled, textFieldClasses, action, showPaidVisibility, showVisibility, className, ...props}) => {
=======
const NavigationItemEditor: React.FC<NavigationItemEditorProps> = ({baseUrl, idPrefix, item, updateItem, uploadIcon, addItem, clearError, labelPlaceholder, unstyled, textFieldClasses, action, showIcon, showPaidVisibility, showVisibility, className, ...props}) => {
>>>>>>> 136a54bc7f (Added navigationIcons labs flag to gate icon/visibility controls):apps/admin-x-settings/src/components/settings/site/navigation/navigation-item-editor.tsx
    return (
        <div className={clsx(navigationRowClasses, className)} data-testid='navigation-item-editor' {...props}>
            {showIcon && (
                <div className={clsx('flex flex-col', navigationColumnClasses.icon, navigationFieldOffsetClass)}>
                    <NavigationIconUpload
                        clearError={clearError}
                        idPrefix={idPrefix}
                        item={item}
                        updateItem={updateItem}
                        uploadIcon={uploadIcon}
                    />
                </div>
            )}
            <div className={clsx('flex', navigationColumnClasses.label, navigationFieldOffsetClass)}>
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
>>>>>>> 8df92567a7 (✨ Added icons and visibility controls to navigation):apps/admin-x-settings/src/components/settings/site/navigation/navigation-item-editor.tsx
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
<<<<<<< HEAD:apps/admin/src/settings/app/components/settings/site/navigation/navigation-item-editor.tsx
            <Field className='flex-1 pt-1' data-invalid={Boolean(item.errors.url) || undefined}>
                <FieldLabel className='sr-only' htmlFor={`navigation-url-${item.id}`}>URL</FieldLabel>
                <Input
                    aria-invalid={Boolean(item.errors.url) || undefined}
=======
            <div className={clsx('flex', navigationColumnClasses.url, navigationFieldOffsetClass)}>
                <URLTextField
                    baseUrl={baseUrl}
>>>>>>> 8df92567a7 (✨ Added icons and visibility controls to navigation):apps/admin-x-settings/src/components/settings/site/navigation/navigation-item-editor.tsx
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
<<<<<<< HEAD:apps/admin/src/settings/app/components/settings/site/navigation/navigation-item-editor.tsx
                {item.errors.url && <FieldError>{item.errors.url}</FieldError>}
            </Field>
            {action && (
                <Inline align='center' className='h-[calc(var(--control-height)+0.25rem)] shrink-0 translate-y-px pt-1'>
                    {action}
                </Inline>
            )}
=======
            </div>
            {showVisibility && (
                <div className={clsx('flex flex-col', navigationColumnClasses.visibility, navigationFieldOffsetClass)}>
                    <NavigationVisibilityDropdown
                        clearError={clearError}
                        idPrefix={idPrefix}
                        item={item}
                        showPaidVisibility={showPaidVisibility}
                        updateItem={updateItem}
                    />
                </div>
            )}
            {action && <div className={clsx('mt-1 flex h-[38px] items-center justify-center', navigationColumnClasses.action)}>{action}</div>}
>>>>>>> 8df92567a7 (✨ Added icons and visibility controls to navigation):apps/admin-x-settings/src/components/settings/site/navigation/navigation-item-editor.tsx
        </div>
    );
};

export default NavigationItemEditor;
