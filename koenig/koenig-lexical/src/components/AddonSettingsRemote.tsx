import React from 'react';
import {DropdownSetting, InputSetting, ToggleSetting} from './ui/SettingsPanel';
import {type RemoteComponentRendererMap, RemoteFragmentRenderer, RemoteRootRenderer, createRemoteComponentRenderer} from '@remote-dom/react/host';

interface EditorControlHostProps {
    label?: string;
    description?: string;
}

interface EditorInputHostProps extends EditorControlHostProps {
    value?: string;
    placeholder?: string;
    onChange?: (value: string) => void;
}

const EditorInputHost = createRemoteComponentRenderer(React.forwardRef<HTMLElement, EditorInputHostProps>(
    function EditorInputHost({label, description, value = '', placeholder, onChange}, _ref) {
        return (
            <InputSetting
                description={description}
                label={label ?? ''}
                placeholder={placeholder}
                value={value}
                onChange={event => void onChange?.(event.target.value)}
            />
        );
    }
));

interface EditorToggleHostProps extends EditorControlHostProps {
    checked?: boolean;
    onChange?: (value: boolean) => void;
}

const EditorToggleHost = createRemoteComponentRenderer(React.forwardRef<HTMLElement, EditorToggleHostProps>(
    function EditorToggleHost({label, description, checked = false, onChange}, _ref) {
        return (
            <ToggleSetting
                description={description}
                isChecked={checked}
                label={label ?? ''}
                onChange={event => void onChange?.(event.target.checked)}
            />
        );
    }
));

interface EditorSelectOption {
    label: string;
    value: string;
}

interface EditorSelectHostProps extends EditorControlHostProps {
    value?: string;
    options?: EditorSelectOption[];
    onChange?: (value: string) => void;
}

const EditorSelectHost = createRemoteComponentRenderer(React.forwardRef<HTMLElement, EditorSelectHostProps>(
    function EditorSelectHost({label, description, value = '', options, onChange}, _ref) {
        const menu = Array.isArray(options)
            ? options.filter(option => typeof option?.label === 'string' && typeof option.value === 'string').map(option => ({name: option.value, label: option.label}))
            : [];
        return (
            <DropdownSetting
                description={description}
                label={label ?? ''}
                menu={menu}
                value={value}
                onChange={nextValue => void onChange?.(nextValue)}
            />
        );
    }
));

const ADDON_SETTINGS_COMPONENTS: RemoteComponentRendererMap = new Map([
    ['gh-editor-input', EditorInputHost],
    ['gh-editor-toggle', EditorToggleHost],
    ['gh-editor-select', EditorSelectHost],
    ['remote-fragment', RemoteFragmentRenderer]
]);

export function AddonSettingsRemote({receiver}) {
    return <RemoteRootRenderer components={ADDON_SETTINGS_COMPONENTS} receiver={receiver} />;
}
