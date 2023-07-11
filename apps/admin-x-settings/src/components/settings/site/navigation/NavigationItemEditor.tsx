import Icon from '../../../../admin-x-ds/global/Icon';
import React, {ReactNode, forwardRef} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import UrlTextField from './UrlTextField';
import {EditableItem, NavigationItem, NavigationItemErrors} from '../../../../hooks/site/useNavigationEditor';

export type NavigationItemEditorProps = React.HTMLAttributes<HTMLDivElement> & {
    baseUrl: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    onDelete?: () => void;
    dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    labelPlaceholder?: string
    unstyled?: boolean
    containerClasses?: string
    dragHandleClasses?: string
    textFieldClasses?: string
    action?: ReactNode
}

const NavigationItemEditor = forwardRef<HTMLDivElement, NavigationItemEditorProps>(function NavigationItemEditor({baseUrl, item, updateItem, onDelete, clearError, dragHandleProps, labelPlaceholder, unstyled, containerClasses, dragHandleClasses, textFieldClasses, action, ...props}, ref) {
    return (
        <div ref={ref} className={containerClasses} data-testid='navigation-item-editor' {...props}>
            <button className={dragHandleClasses} type='button' {...dragHandleProps}>
                <Icon colorClass='text-grey-500' name='hamburger' size='sm' />
            </button>
            <div className="flex flex-1">
                <TextField
                    className={textFieldClasses}
                    containerClassName="w-full"
                    error={!!item.errors.label}
                    hint={item.errors.label}
                    hintClassName="px-2"
                    placeholder={labelPlaceholder}
                    title='Label'
                    unstyled={unstyled}
                    value={item.label}
                    hideTitle
                    onChange={e => updateItem?.({label: e.target.value})}
                    onKeyDown={() => clearError?.('label')}
                />
            </div>
            <div className="flex flex-1">
                <UrlTextField
                    baseUrl={baseUrl}
                    className={textFieldClasses}
                    containerClassName="w-full"
                    error={!!item.errors.url}
                    hint={item.errors.url}
                    hintClassName="px-2"
                    title='URL'
                    unstyled={unstyled}
                    value={item.url}
                    hideTitle
                    onChange={value => updateItem?.({url: value})}
                    onKeyDown={() => clearError?.('url')}
                />
            </div>
            {action}
        </div>
    );
});

export default NavigationItemEditor;
