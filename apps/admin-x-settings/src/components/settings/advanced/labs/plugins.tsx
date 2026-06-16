import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ConfirmationModal, SettingGroupHeader, showToast} from '@tryghost/admin-x-design-system';
import {Button} from '@tryghost/shade/components';
import {useGlobalData} from '../../../providers/global-data-provider';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {getGhostPaths} from '@tryghost/admin-x-framework/helpers';
import NiceModal from '@ebay/nice-modal-react';
import DOMPurify from 'dompurify';

const DEFAULT_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';

function sanitizeIcon(rawIcon: string | undefined): string {
    if (!rawIcon) return DEFAULT_ICON;
    const clean = DOMPurify.sanitize(rawIcon, {
        ALLOWED_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'clipPath', 'mask', 'use'],
        ALLOWED_ATTR: ['d', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'xmlns', 'width', 'height', 'transform', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'clip-path', 'id', 'href', 'opacity', 'style']
    });
    return clean || DEFAULT_ICON;
}

type PluginCard = {
    plugin: string;
    pluginVersion: string;
    name: string;
    label: string;
    icon: string;
    fields: Array<{
        key: string;
        type: string;
        title: string;
        default?: unknown;
    }>;
    template: string;
};

const PluginCardItem: React.FC<{
    card: PluginCard;
    enabled: boolean;
    onDelete: (name: string) => void;
    onDownload: (name: string) => Promise<void>;
    deleting: boolean;
}> = ({card, enabled, onDelete, onDownload, deleting}) => {
    return (
        <div className={`flex items-start gap-4 rounded-lg border p-4 ${enabled ? 'border-green bg-green/5' : 'border-border bg-white dark:border-dark-border dark:bg-dark-bg'}`}>
            <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-grey-100 text-black dark:bg-dark-200 dark:text-white"
                dangerouslySetInnerHTML={{__html: sanitizeIcon(card.icon)}}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{card.label}</h3>
                    <span className="rounded bg-grey-100 px-1.5 py-0.5 text-xs text-grey-600 dark:bg-dark-200 dark:text-grey-400">
                        {card.plugin} v{card.pluginVersion}
                    </span>
                    {enabled && (
                        <span className="rounded bg-green/10 px-1.5 py-0.5 text-xs font-medium text-green">Active</span>
                    )}
                </div>
                <p className="mt-1 text-sm text-grey-600 dark:text-grey-400">
                    {card.fields.length} field{card.fields.length !== 1 ? 's' : ''}: {card.fields.map(f => f.title).join(', ')}
                </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
                <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-grey-400 transition-colors hover:bg-grey-100 hover:text-grey-700 dark:hover:bg-dark-200 dark:hover:text-grey-300"
                    title="Download plugin"
                    onClick={() => onDownload(card.plugin)}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4" />
                    </svg>
                </button>
                <button
                    className="flex h-8 w-8 items-center justify-center rounded-md text-grey-400 transition-colors hover:bg-red/10 hover:text-red disabled:opacity-50"
                    disabled={deleting}
                    title="Delete plugin"
                    onClick={() => onDelete(card.plugin)}
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

const PluginsManager: React.FC = () => {
    const {settings} = useGlobalData();
    const labs = JSON.parse(getSettingValue<string>(settings, 'labs') || '{}');
    const isEnabled = labs.customCardPlugins === true;
    const [plugins, setPlugins] = useState<PluginCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPlugins = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/ghost/api/admin/plugins/cards/', {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            setPlugins(data.plugins?.flat() || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load plugins');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isEnabled) {
            setPlugins([]);
            return;
        }
        fetchPlugins();
    }, [isEnabled, fetchPlugins]);

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/ghost/api/admin/plugins/install', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.errors?.[0]?.message || `HTTP ${response.status}`);
            }

            // Refresh the plugin list
            await fetchPlugins();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to install plugin');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (name: string) => {
        NiceModal.show(ConfirmationModal, {
            title: `Delete plugin "${name}"?`,
            prompt: 'This will remove all its files. Posts using this plugin\'s cards will be converted to static HTML.',
            okColor: 'red',
            okLabel: 'Delete',
            onOk: async (modal) => {
                setDeleting(name);
                setError(null);

                try {
                    const response = await fetch(`/ghost/api/admin/plugins/${name}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.errors?.[0]?.message || `HTTP ${response.status}`);
                    }

                    await fetchPlugins();
                    showToast({title: `Plugin "${name}" deleted`, type: 'success'});
                    modal?.remove();
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete plugin');
                    modal?.remove();
                } finally {
                    setDeleting(null);
                }
            }
        });
    };

    const handleDownload = async (name: string) => {
        const {apiRoot} = getGhostPaths();
        try {
            const response = await fetch(`${apiRoot}/plugins/${name}/download/`, {
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.errors?.[0]?.message || `HTTP ${response.status}`);
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to download plugin');
        }
    };

    if (!isEnabled) {
        return null;
    }

    return (
        <div className="mt-4">
            <div className="mb-4 flex items-center justify-between">
                <SettingGroupHeader
                    description="Manage installed card plugins that extend the editor with custom content blocks."
                    title="Card Plugins"
                />
                <input
                    ref={fileInputRef}
                    accept=".zip"
                    className="hidden"
                    type="file"
                    onChange={handleUpload}
                />
                <Button
                    color="green"
                    disabled={uploading}
                    icon="add"
                    label={uploading ? 'Installing...' : 'Install plugin'}
                    onClick={() => fileInputRef.current?.click()}
                />
            </div>

            {loading && (
                <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-grey-500">Loading plugins...</div>
                </div>
            )}

            {error && (
                <div className="mb-4 rounded-lg border border-red bg-red/5 p-4 text-sm text-red">
                    {error}
                </div>
            )}

            {!loading && !error && plugins.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-grey-300 py-12 text-center dark:border-dark-600">
                    <div className="mb-3 text-grey-400">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-grey-900 dark:text-white">No plugins installed</h3>
                    <p className="mb-4 max-w-xs text-sm text-grey-500">
                        Install card plugins (.zip) to extend the editor with custom content blocks.
                    </p>
                    <Button
                        color="green"
                        disabled={uploading}
                        label={uploading ? 'Installing...' : 'Install your first plugin'}
                        onClick={() => fileInputRef.current?.click()}
                    />
                </div>
            )}

            {!loading && !error && plugins.length > 0 && (
                <div className="space-y-3">
                    {plugins.map((card, index) => (
                        <PluginCardItem
                            key={`${card.plugin}-${card.name}-${index}`}
                            card={card}
                            deleting={deleting === card.plugin}
                            enabled={true}
                            onDelete={handleDelete}
                            onDownload={handleDownload}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PluginsManager;
