import {Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input} from '@tryghost/shade/components';
import {
    POSTS_VIEW_COLORS,
    POSTS_VIEW_COLOR_HEX,
    hasPostsViewNameConflict
} from '../posts-views';
import {useDeletePostsView, useSavePostsView} from '../hooks/use-posts-views';
import {useState} from 'react';
import type {PostsResource} from '../posts-query-params';
import type {PostsView} from '../posts-views';

interface CustomViewModalProps {
    resource: PostsResource;
    /** The current filter query params, used when creating a new view */
    filter: Record<string, string>;
    /** All views for this route (incl. defaults), used for duplicate-name validation */
    views: PostsView[];
    /** The saved view being edited; null when creating a new view */
    activeView: PostsView | null;
    onClose: () => void;
    /** Called after the active view has been deleted */
    onDeleted: () => void;
}

function randomViewColor(): string {
    return POSTS_VIEW_COLORS[Math.floor(Math.random() * POSTS_VIEW_COLORS.length)];
}

function CustomViewModal({resource, filter, views, activeView, onClose, onDeleted}: CustomViewModalProps) {
    const isNew = !activeView;
    const [name, setName] = useState(() => activeView?.name ?? '');
    const [color, setColor] = useState(() => activeView?.color ?? randomViewColor());
    const [error, setError] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const saveView = useSavePostsView();
    const deleteView = useDeletePostsView();

    const viewFilter = activeView ? activeView.filter : filter;

    const handleSave = async () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            // Same message as Ember's custom-view name validator
            setError('Please enter a name');
            return;
        }

        if (hasPostsViewNameConflict(views, {route: resource, name: trimmedName, filter: viewFilter})) {
            // Same message as Ember's duplicate-name validation
            setError('Has already been used');
            return;
        }

        setIsBusy(true);

        try {
            await saveView({
                name: trimmedName,
                route: resource,
                color,
                filter: Object.fromEntries(
                    Object.entries(viewFilter).filter(([, value]) => value !== null)
                ) as Record<string, string>
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save view');
        } finally {
            setIsBusy(false);
        }
    };

    const handleDelete = async () => {
        if (!activeView) {
            return;
        }

        setIsBusy(true);

        try {
            await deleteView(activeView);
            onClose();
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete view');
        } finally {
            setIsBusy(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void handleSave();
        }
    };

    return (
        <Dialog open onOpenChange={(open) => {
            if (!open) {
                onClose();
            }
        }}>
            <DialogContent data-testid="custom-view-modal">
                <DialogHeader>
                    <DialogTitle>{isNew ? 'New view' : 'Edit view'}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold" htmlFor="view-name">View name</label>
                        <Input
                            id="view-name"
                            placeholder="Breaking news"
                            value={name}
                            autoFocus
                            onChange={(event) => {
                                setName(event.target.value);

                                if (error) {
                                    setError('');
                                }
                            }}
                            onKeyDown={handleKeyDown}
                        />
                        {error ? (
                            <p className="text-sm text-red-600" data-test-error="custom-view-name">{error}</p>
                        ) : (
                            isNew && <p className="text-sm text-muted-foreground">Saved views appear in the app sidebar.</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold" id="view-color-label">Icon color</span>
                        <div aria-labelledby="view-color-label" className="flex items-center justify-between" role="radiogroup">
                            {POSTS_VIEW_COLORS.map(viewColor => (
                                <input
                                    key={viewColor}
                                    aria-label={viewColor}
                                    checked={color === viewColor}
                                    className="size-6 cursor-pointer appearance-none rounded-full transition-shadow checked:ring-2 checked:ring-foreground checked:ring-offset-2"
                                    name="view-color"
                                    style={{backgroundColor: POSTS_VIEW_COLOR_HEX[viewColor]}}
                                    type="radio"
                                    value={viewColor}
                                    onChange={() => setColor(viewColor)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    {isNew ? (
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                    ) : (
                        <Button
                            disabled={isBusy}
                            variant="destructive"
                            onClick={() => void handleDelete()}
                        >
                            Delete
                        </Button>
                    )}
                    <Button disabled={isBusy} onClick={() => void handleSave()}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default CustomViewModal;
