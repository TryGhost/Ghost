import NavigationIconUpload from './navigation-icon-upload';
import NavigationVisibilityDropdown from './navigation-visibility-dropdown';
import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {type EditableItem, type NavigationItem, type NavigationItemErrors} from '../../../../hooks/site/use-navigation-editor';
import {TextField, URLTextField, formatUrl} from '@tryghost/admin-x-design-system';
import {navigationColumnClasses, navigationFieldOffsetClass, navigationRowClasses} from './navigation-layout';

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
    showPaidVisibility: boolean
    showVisibility: boolean
}

const NavigationItemEditor: React.FC<NavigationItemEditorProps> = ({baseUrl, idPrefix, item, updateItem, uploadIcon, addItem, clearError, labelPlaceholder, unstyled, textFieldClasses, action, showPaidVisibility, showVisibility, className, ...props}) => {
    return (
        <div className={clsx(navigationRowClasses, className)} data-testid='navigation-item-editor' {...props}>
            <div className={clsx('flex flex-col', navigationColumnClasses.icon, navigationFieldOffsetClass)}>
                <NavigationIconUpload
                    clearError={clearError}
                    idPrefix={idPrefix}
                    item={item}
                    updateItem={updateItem}
                    uploadIcon={uploadIcon}
                />
            </div>
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
            <div className={clsx('flex', navigationColumnClasses.url, navigationFieldOffsetClass)}>
                <URLTextField
                    baseUrl={baseUrl}
                    className={textFieldClasses}
                    containerClassName="grow"
                    error={!!item.errors.url}
                    hint={item.errors.url}
                    title='URL'
                    unstyled={unstyled}
                    value={item.url}
                    hideTitle
                    onChange={value => updateItem?.({url: value || ''})}
                    onKeyDown={(e) => {
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
        </div>
    );
};

export default NavigationItemEditor;
