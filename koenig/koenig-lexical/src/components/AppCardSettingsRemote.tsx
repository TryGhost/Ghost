import React, {useEffect, useRef, useState} from 'react';
import {DropdownSetting, InputSetting, ToggleSetting} from './ui/SettingsPanel';
import {
    type RemoteComponentRendererMap,
    RemoteFragmentRenderer,
    RemoteRootRenderer,
    createRemoteComponentRenderer
} from '@remote-dom/react/host';

// The elements an app's settings code may use, drawn with the same controls as
// Koenig's own cards. The app's code runs in a sandbox and only describes them.

interface ControlProps {
    label?: string;
    description?: string;
}

// Keeps what the author is typing, and only takes the app's value when it
// changes to something other than what was last typed.
function useDraft(value: string, onChange?: (value: string) => void) {
    const [draft, setDraft] = useState(value);
    const sent = useRef(value);
    useEffect(() => {
        if (value !== sent.current) {
            sent.current = value;
            setDraft(value);
        }
    }, [value]);
    const update = (next: string) => {
        sent.current = next;
        setDraft(next);
        void onChange?.(next);
    };
    return [draft, update] as const;
}

interface TextProps extends ControlProps {
    value?: string;
    placeholder?: string;
    onChange?: (value: string) => void;
}

export function AppCardInput({label, description, value = '', placeholder, onChange}: TextProps) {
    const [draft, update] = useDraft(value, onChange);
    return (
        <InputSetting
            dataTestId="app-card-input"
            description={description}
            label={label ?? ''}
            placeholder={placeholder}
            value={draft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => update(event.target.value)}
        />
    );
}

export function AppCardTextarea({label, description, value = '', placeholder, onChange}: TextProps) {
    const [draft, update] = useDraft(value, onChange);
    return (
        <label className="flex w-full flex-col">
            <span className="mb-1.5 text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</span>
            <textarea
                className="min-h-[96px] w-full rounded-lg border border-grey-300 bg-grey-50 px-3 py-2 font-sans text-sm text-grey-900 placeholder:text-grey-500 focus:border-green focus:bg-white focus:shadow-[0_0_0_2px_rgba(48,207,67,.25)] focus-visible:outline-none dark:border-grey-900 dark:bg-grey-925 dark:text-white"
                data-testid="app-card-textarea"
                placeholder={placeholder}
                value={draft}
                onChange={event => update(event.target.value)}
            />
            {description && <span className="mt-1 text-xs font-normal leading-snug text-grey-700 dark:text-grey-600">{description}</span>}
        </label>
    );
}

interface SelectProps extends ControlProps {
    value?: string;
    options?: {label: string; value: string}[];
    onChange?: (value: string) => void;
}

export function AppCardSelect({label, description, value = '', options, onChange}: SelectProps) {
    const menu = Array.isArray(options)
        ? options
            .filter(option => typeof option?.label === 'string' && typeof option.value === 'string')
            .map(option => ({name: option.value, label: option.label}))
        : [];
    return (
        <DropdownSetting
            dataTestId="app-card-select"
            description={description}
            label={label ?? ''}
            menu={menu}
            value={value}
            onChange={(next: string) => void onChange?.(next)}
        />
    );
}

interface ToggleProps extends ControlProps {
    checked?: boolean;
    onChange?: (value: boolean) => void;
}

export function AppCardToggle({label, description, checked = false, onChange}: ToggleProps) {
    return (
        <ToggleSetting
            dataTestId="app-card-toggle"
            description={description}
            isChecked={checked}
            label={label ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => void onChange?.(event.target.checked)}
        />
    );
}

export interface AppCardFile {
    name: string;
    type: string;
    size: number;
    bytes: Uint8Array;
}

// Files are read here, in the editor, and only their bytes reach the card.
export const APP_CARD_FILE_MAX_BYTES = 1_000_000;

interface FileProps extends ControlProps {
    accept?: string;
    buttonLabel?: string;
    onChange?: (value: AppCardFile) => void;
}

export function AppCardFileInput({label, description, accept, buttonLabel, onChange}: FileProps) {
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const revision = useRef(0);

    const select = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        const current = ++revision.current;
        if (file.size > APP_CARD_FILE_MAX_BYTES) {
            setError('That file is too large. Choose one under 1 MB.');
            return;
        }
        setError('');
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (revision.current === current) {
                setFileName(file.name);
                onChange?.({name: file.name, type: file.type, size: file.size, bytes});
            }
        } catch {
            if (revision.current === current) {
                setError('That file couldn’t be read.');
            }
        }
    };

    return (
        <div className="flex w-full flex-col">
            <div className="mb-1.5 text-sm font-medium tracking-normal text-grey-900 dark:text-grey-300">{label}</div>
            <div className="flex items-center gap-2">
                <button
                    className="rounded-md border border-grey-300 px-3 py-1.5 text-sm font-medium text-grey-900 hover:border-grey-500 dark:border-grey-800 dark:text-white"
                    data-testid="app-card-file"
                    type="button"
                    onClick={() => input.current?.click()}
                >
                    {buttonLabel || 'Choose file'}
                </button>
                {fileName && <span className="truncate text-xs text-grey-700">{fileName}</span>}
            </div>
            <input ref={input} accept={accept} className="hidden" type="file" onChange={event => void select(event)} />
            {(error || description) && <p className={`mt-1 text-xs font-normal leading-snug ${error ? 'text-red' : 'text-grey-700 dark:text-grey-600'}`}>{error || description}</p>}
        </div>
    );
}

export function AppCardRow({children}: {children?: React.ReactNode}) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function AppCardNote({tone, children}: {tone?: string; children?: React.ReactNode}) {
    return <p className={`text-xs leading-snug ${tone === 'error' ? 'text-red' : 'text-grey-700 dark:text-grey-500'}`}>{children}</p>;
}

// remote-dom's renderers pass a ref; the controls don't need it.
function host<P>(Component: React.ComponentType<P>) {
    return createRemoteComponentRenderer(React.forwardRef<HTMLElement, P>(function AppCardControl(props, _ref) {
        return <Component {...(props as P & React.JSX.IntrinsicAttributes)} />;
    }));
}

export const APP_CARD_SETTINGS_COMPONENTS: RemoteComponentRendererMap = new Map([
    ['ghost-card-input', host(AppCardInput)],
    ['ghost-card-textarea', host(AppCardTextarea)],
    ['ghost-card-select', host(AppCardSelect)],
    ['ghost-card-toggle', host(AppCardToggle)],
    ['ghost-card-file', host(AppCardFileInput)],
    ['ghost-card-row', host(AppCardRow)],
    ['ghost-card-note', host(AppCardNote)],
    ['remote-fragment', RemoteFragmentRenderer]
]) as RemoteComponentRendererMap;

export function AppCardSettingsRemote({receiver}: {receiver: unknown}) {
    return (
        <div className="flex min-w-0 flex-col gap-4" data-testid="app-card-settings">
            <RemoteRootRenderer components={APP_CARD_SETTINGS_COMPONENTS} receiver={receiver as never} />
        </div>
    );
}
