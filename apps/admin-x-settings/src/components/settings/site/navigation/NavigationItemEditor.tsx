import React, {ReactNode} from 'react';
import TextField from '../../../../admin-x-ds/global/form/TextField';
import URLTextField from '../../../../admin-x-ds/global/form/URLTextField';
import clsx from 'clsx';
import {EditableItem, NavigationItem, NavigationItemErrors} from '../../../../hooks/site/useNavigationEditor';

export type NavigationItemEditorProps = React.HTMLAttributes<HTMLDivElement> & {
    baseUrl: string;
    item: EditableItem;
    clearError?: (key: keyof NavigationItemErrors) => void;
    updateItem?: (item: Partial<NavigationItem>) => void;
    labelPlaceholder?: string
    unstyled?: boolean
    textFieldClasses?: string
    action?: ReactNode
}

const NavigationItemEditor: React.FC<NavigationItemEditorProps> = ({baseUrl, item, updateItem, clearError, labelPlaceholder, unstyled, textFieldClasses, action, className, ...props}) => {
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
                    onKeyDown={() => clearError?.('label')}
                />
            </div>
            <div className="flex flex-1 pt-1">
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
                    onChange={value => updateItem?.({url: value})}
                    onKeyDown={() => clearError?.('url')}
                />
            </div>
            {action}
        </div>
    );
};

export default NavigationItemEditor;
