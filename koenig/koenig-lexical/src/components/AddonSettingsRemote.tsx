import React, {useRef, useState} from 'react';
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

export interface EditorFileInputValue {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
}

interface EditorFileInputHostProps extends EditorControlHostProps {
    accept?: string;
    maxBytes?: number;
    onChange?: (value: EditorFileInputValue) => void;
}

const MAX_ADDON_SETTINGS_FILE_BYTES = 1024 * 1024;

export function EditorFileInputControl({label, description, accept, maxBytes, onChange}: EditorFileInputHostProps) {
    const [error, setError] = useState('');
    const selectionRevision = useRef(0);
    const requestedLimit = typeof maxBytes === 'number' && Number.isFinite(maxBytes) && maxBytes > 0
        ? maxBytes
        : MAX_ADDON_SETTINGS_FILE_BYTES;
    const limit = Math.min(requestedLimit, MAX_ADDON_SETTINGS_FILE_BYTES);

    const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const revision = ++selectionRevision.current;
        if (file.size > limit) {
            setError('The selected file is too large.');
            return;
        }

        setError('');
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (selectionRevision.current === revision) {
                onChange?.({name: file.name, type: file.type, size: file.size, bytes});
            }
        } catch {
            if (selectionRevision.current === revision) {
                setError('The selected file could not be read.');
            }
        }
    };

    return (
        <div className="flex w-full flex-col justify-between">
            <label className="mb-1.5 text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">
                {label}
                <input accept={accept} className="mt-1 block w-full text-sm" type="file" onChange={event => void selectFile(event)} />
            </label>
            {(error || description) && <p className="text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{error || description}</p>}
        </div>
    );
}

const EditorFileInputHost = createRemoteComponentRenderer(React.forwardRef<HTMLElement, EditorFileInputHostProps>(
    function EditorFileInputHost(props, _ref) {
        return <EditorFileInputControl {...props} />;
    }
));

const ADDON_SETTINGS_COMPONENTS: RemoteComponentRendererMap = new Map([
    ['gh-editor-input', EditorInputHost],
    ['gh-editor-toggle', EditorToggleHost],
    ['gh-editor-select', EditorSelectHost],
    ['gh-editor-file-input', EditorFileInputHost],
    ['remote-fragment', RemoteFragmentRenderer]
]);

export function AddonSettingsRemote({receiver}) {
    return <RemoteRootRenderer components={ADDON_SETTINGS_COMPONENTS} receiver={receiver} />;
}
