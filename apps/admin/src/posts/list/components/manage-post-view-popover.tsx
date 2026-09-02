import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { POST_VIEW_COLORS, type PostViewColor, pickPostViewColor } from '@/posts/list/post-views';
import { getColorHex } from '@/layout/app-sidebar/shared-views';
import { useDeletePostView, useSavePostView } from '@/posts/list/hooks/use-post-views';
import { useNavigate } from '@tryghost/admin-x-framework';
import { useState } from 'react';
import type { PostListParams } from '@/posts/list/post-query-params';
import type { PostResource } from '@/posts/list/post-resource';
import type { SharedView } from '@/members/api';

interface ManagePostViewPopoverProps {
  resource: PostResource;
  params: PostListParams;
  /** The saved view matching the current params, if the user is on one. */
  activeView?: SharedView;
}

function isPostViewColor(value: string | undefined): value is PostViewColor {
  return POST_VIEW_COLORS.includes(value as PostViewColor);
}

function ColorPicker({
  value,
  onChange,
}: {
  value: PostViewColor;
  onChange: (color: PostViewColor) => void;
}) {
  return (
    <Inline gap="sm" role="radiogroup">
      {POST_VIEW_COLORS.map((color) => (
        <button
          key={color}
          aria-checked={color === value}
          aria-label={color}
          className={cn(
            'size-5 rounded-full border-2',
            color === value ? 'border-foreground' : 'border-transparent',
          )}
          role="radio"
          style={{ backgroundColor: getColorHex(color) }}
          type="button"
          onClick={() => {
            onChange(color);
          }}
        />
      ))}
    </Inline>
  );
}

function PopoverBody({
  resource,
  params,
  activeView,
  onClose,
}: ManagePostViewPopoverProps & { onClose: () => void }) {
  const [name, setName] = useState(activeView?.name ?? '');
  const [color, setColor] = useState<PostViewColor>(
    isPostViewColor(activeView?.color) ? activeView.color : pickPostViewColor(),
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const savePostView = useSavePostView();
  const deletePostView = useDeletePostView();
  const navigate = useNavigate();

  const isEditing = Boolean(activeView);

  const handleSave = async () => {
    if (busy) {
      return;
    }

    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter a name');
      return;
    }

    setBusy(true);

    try {
      await savePostView(trimmed, params, color, activeView);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save view');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!activeView || busy) {
      return;
    }

    setBusy(true);

    try {
      await deletePostView(activeView);
      onClose();
      // Ember navigates back to the clean route after deleting. Staying
      // put would leave you on the deleted view's URL, watching its
      // sidebar entry vanish while the button flips back to "Save as
      // view" — where saving would simply re-create it.
      navigate(`/${resource}`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete view');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <Input
        aria-label="View name"
        placeholder="Name this view"
        value={name}
        autoFocus
        onChange={(event) => {
          setName(event.target.value);
          setError('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            void handleSave();
          }
        }}
      />
      <ColorPicker value={color} onChange={setColor} />
      {error && (
        <Text className="text-state-danger" role="alert" size="sm">
          {error}
        </Text>
      )}
      <Inline gap="sm" justify={isEditing ? 'between' : 'end'}>
        {isEditing && (
          <Button disabled={busy} variant="destructive" onClick={() => void handleDelete()}>
            Delete
          </Button>
        )}
        <Button disabled={busy} onClick={() => void handleSave()}>
          {isEditing ? 'Save' : 'Save view'}
        </Button>
      </Inline>
    </Stack>
  );
}

/**
 * The save/edit-view affordance. Whether it shows at all is decided by
 * `canSavePostView` — admins only, posts only, not on a default view, and at
 * least one of the five view params set.
 *
 * Rendered in the filter bar beside Clear when there are filters, and in the
 * page header when there are not. Both placements exist because that last rule
 * includes `order`: a sort on its own makes the view saveable, and the bar only
 * appears when there are chips to put in it.
 */
export function ManagePostViewPopover({
  resource,
  params,
  activeView,
}: ManagePostViewPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* Labelled in words. No `aria-label`: it would override the
                    visible text as the accessible name, leaving the two out of
                    step. */}
        <Button data-testid="manage-post-view" variant="outline">
          {activeView ? 'Edit view' : 'Save view'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {/* Keyed so reopening starts from the current view's name. */}
        <PopoverBody
          key={activeView?.name ?? 'new'}
          activeView={activeView}
          params={params}
          resource={resource}
          onClose={() => {
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
